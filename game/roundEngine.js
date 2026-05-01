const { generateCrashPoint } = require("./provablyFair");
const User = require("../models/user");
const Bet = require("../models/Bet");
const GameRound = require("../models/GameRound");

class RoundEngine {
  constructor(io) {
    this.io = io;
    this.state = "WAITING";
    this.countdown = 10;
    this.multiplier = 1.0;
    this.crashPoint = 0;
    this.roundId = 0;
    this.players = {};
    this.waitInterval = null;
    this.flyInterval = null;
    this.crashHistory = [];
    this.startWaiting();
  }

  startWaiting() {
    this.state = "WAITING";
    this.countdown = 10;
    this.players = {};
    this.crashPoint = generateCrashPoint();
    this.roundId++;
    console.log(`⏳ Round ${this.roundId} — crash at ${this.crashPoint.toFixed(2)}x`);
    this.io.emit("crash_history", { history: this.crashHistory });
    this.waitInterval = setInterval(() => this._waitTick(), 1000);
  }

  _waitTick() {
    if (this.state !== "WAITING") return;
    this.io.emit("round_waiting", { countdown: this.countdown });
    if (this.countdown <= 0) {
      clearInterval(this.waitInterval);
      this.waitInterval = null;
      this._startRound();
      return;
    }
    this.countdown--;
  }

  _startRound() {
    this.state = "FLYING";
    this.multiplier = 1.0;
    console.log(`🛫 Round ${this.roundId} starting`);
    this.io.emit("round_start", { roundId: this.roundId });
    this.flyInterval = setInterval(() => this._flyTick(), 100);
  }

  // NOT async — never blocks the game loop
  _flyTick() {
    if (this.state !== "FLYING") return;

    this.multiplier += 0.015 + this.multiplier * 0.0018;
    const mult = Math.round(this.multiplier * 100) / 100;
    this.io.emit("game_tick", { multiplier: mult });

    // Auto cashouts — cashingOut flag prevents duplicate DB calls
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.cashed && !p.cashingOut && p.autoCashout > 1 && mult >= p.autoCashout) {
        p.cashingOut = true;
        const sock = this.io.sockets.sockets.get(id);
        if (sock) this._doCashout(sock, p, mult);
      }
    }

    if (mult >= this.crashPoint) {
      clearInterval(this.flyInterval);
      this.flyInterval = null;
      this._crash();
    }
  }

  async addBet(socket, data) {
    const amount = data && data.amount;
    const autoCashout = data && data.autoCashout;
    const userId = socket.user && (socket.user.id || socket.user._id);

    if (!userId) return socket.emit("error_msg", "Please login to bet");
    if (this.state !== "WAITING") return socket.emit("error_msg", "Wait for next round");
    if (this.players[socket.id]) return socket.emit("error_msg", "Bet already placed this round");

    const betAmt = Number(amount);
    const autoCO = Number(autoCashout) || 0;

    if (!betAmt || betAmt < 30) return socket.emit("error_msg", "Minimum stake is KES 30");

    try {
      const user = await User.findById(userId);
      if (!user) return socket.emit("error_msg", "Account not found");
      if (user.walletBalance < betAmt) {
        return socket.emit("error_msg", `Insufficient balance — KES ${Math.floor(user.walletBalance)} available`);
      }
      user.walletBalance -= betAmt;
      await user.save();

      this.players[socket.id] = {
        userId: user._id.toString(),
        amount: betAmt,
        autoCashout: autoCO,
        cashed: false,
        cashingOut: false
      };

      socket.emit("bet_placed", { amount: betAmt });
      console.log(`💰 Bet: ${user.name || user.phone} — KES ${betAmt}`);
    } catch (err) {
      console.error("addBet error:", err.message);
      socket.emit("error_msg", "Bet failed. Try again.");
    }
  }

  async cancelBet(socket) {
    const userId = socket.user && (socket.user.id || socket.user._id);
    if (!userId) return socket.emit("error_msg", "Not logged in");
    if (this.state !== "WAITING") return socket.emit("error_msg", "Cannot cancel — flight started");

    const p = this.players[socket.id];
    if (!p) return socket.emit("error_msg", "No active bet");

    // Remove first to prevent race condition
    delete this.players[socket.id];

    try {
      const user = await User.findById(p.userId);
      if (!user) {
        this.players[socket.id] = p; // restore
        return socket.emit("error_msg", "Account error — cancel failed");
      }
      user.walletBalance += p.amount;
      await user.save();
      socket.emit("bet_cancelled", { amount: p.amount });
      console.log(`🚫 Cancelled — KES ${p.amount} refunded`);
    } catch (err) {
      this.players[socket.id] = p; // restore on failure
      console.error("cancelBet error:", err.message);
      socket.emit("error_msg", "Cancel failed — try again");
    }
  }

  // Called from socket event — manual cashout
  cashout(socket) {
    const p = this.players[socket.id];
    if (!p || p.cashed || p.cashingOut) return;
    if (this.state !== "FLYING") return;
    p.cashingOut = true;
    this._doCashout(socket, p, null);
  }

  // Single cashout path used by both manual + auto
  _doCashout(socket, p, forcedMult) {
    const usedMult = (forcedMult !== null && forcedMult !== undefined)
      ? Number(forcedMult)
      : Number(this.multiplier.toFixed(2));

    const payout = Math.floor(p.amount * usedMult);
    p.cashed = true; // lock synchronously

    User.findById(p.userId)
      .then(user => {
        if (!user) throw new Error("User not found");
        user.walletBalance += payout;
        return user.save();
      })
      .then(() => Bet.create({
        userId: p.userId,
        amount: p.amount,
        multiplier: Number(usedMult.toFixed(2)),
        payout,
        result: "win"
      }))
      .then(() => {
        socket.emit("cashout_success", {
          multiplier: Number(usedMult.toFixed(2)),
          payout
        });
        console.log(`🏆 Cashout: KES ${payout} at ${usedMult.toFixed(2)}x`);
      })
      .catch(err => {
        // Revert so player can retry
        p.cashed = false;
        p.cashingOut = false;
        console.error("_doCashout error:", err.message);
        socket.emit("error_msg", "Cashout failed — try again");
      });
  }

  _crash() {
    this.state = "CRASHED";
    const crashPt = Number(this.crashPoint.toFixed(2));

    this.crashHistory.unshift(crashPt);
    if (this.crashHistory.length > 5) this.crashHistory = this.crashHistory.slice(0, 5);

    this.io.emit("round_crash", { crashPoint: crashPt, history: this.crashHistory });
    console.log(`💥 Crash at ${crashPt}x | [${this.crashHistory.join(", ")}]`);

    GameRound.create({ roundId: this.roundId, crashPoint: crashPt })
      .catch(err => console.error("GameRound save:", err.message));

    Object.entries(this.players).forEach(([id, p]) => {
      if (!p.cashed) {
        Bet.create({
          userId: p.userId,
          amount: p.amount,
          multiplier: crashPt,
          payout: 0,
          result: "lose"
        }).catch(err => console.error("Loss record:", err.message));

        const sock = this.io.sockets.sockets.get(id);
        if (sock) sock.emit("bet_lost");
      }
    });

    setTimeout(() => this.startWaiting(), 5000);
  }
}

module.exports = RoundEngine;