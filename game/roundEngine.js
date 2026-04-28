const { generateCrashPoint } = require("./provablyFair");
const User = require("../models/user");
const Bet = require("../models/Bet");
const GameRound = require("../models/GameRound");

class RoundEngine {
  constructor(io) {
    this.io = io;

    this.state = "WAITING";   // WAITING | FLYING | CRASHED
    this.countdown = 10;

    this.multiplier = 1.0;
    this.crashPoint = 0;
    this.roundId = 0;

    this.players = {};        // socket.id => { userId, amount, autoCashout, cashed }

    this.waitInterval = null;
    this.flyInterval = null;

    this.startWaiting();
  }

  // ===================== WAITING PHASE =====================
  startWaiting() {
    this.state = "WAITING";
    this.countdown = 10;
    this.players = {};

    this.waitInterval = setInterval(() => this._waitTick(), 1000);
  }

  _waitTick() {
    if (this.state !== "WAITING") return;

    this.io.emit("round_waiting", { countdown: this.countdown });
    this.countdown--;

    if (this.countdown < 0) {
      clearInterval(this.waitInterval);
      this._startRound();
    }
  }

  // ===================== START ROUND =====================
  _startRound() {
    this.state = "FLYING";
    this.multiplier = 1.0;
    this.crashPoint = generateCrashPoint();
    this.roundId++;

    console.log(`🛫 Round ${this.roundId} starting — crash at ${this.crashPoint.toFixed(2)}x`);

    this.io.emit("round_start", { roundId: this.roundId });

    this.flyInterval = setInterval(() => this._flyTick(), 100);
  }

  // ===================== FLYING PHASE =====================
  _flyTick() {
    if (this.state !== "FLYING") return;

    // Exponential multiplier growth
    this.multiplier += 0.015 + this.multiplier * 0.0018;
    const mult = Math.round(this.multiplier * 100) / 100;

    this.io.emit("game_tick", { multiplier: mult });

    // Auto cashouts
    for (const id in this.players) {
      const p = this.players[id];
      if (!p.cashed && p.autoCashout > 1 && mult >= p.autoCashout) {
        const sock = this.io.sockets.sockets.get(id);
        if (sock) this.cashout(sock, mult).catch(console.error);
      }
    }

    // Crash check
    if (mult >= this.crashPoint) {
      clearInterval(this.flyInterval);
      this._crash();
    }
  }

  // ===================== PLACE BET =====================
  async addBet(socket, { amount, autoCashout }) {
    if (!socket.user) {
      return socket.emit("error_msg", "Please login to bet");
    }

    if (this.state !== "WAITING") {
      return socket.emit("error_msg", "Round in progress — wait for next round");
    }

    if (this.players[socket.id]) {
      return socket.emit("error_msg", "You already placed a bet this round");
    }

    const betAmt = Number(amount);
    const autoCO = Number(autoCashout) || 0;

    if (!betAmt || betAmt < 30) {
      return socket.emit("error_msg", "Minimum stake is KES 30");
    }

    try {
      const user = await User.findById(socket.user.id);

      if (!user) return socket.emit("error_msg", "Account not found");

      if (user.walletBalance < betAmt) {
        return socket.emit("error_msg", `Insufficient balance. Your balance is KES ${Math.floor(user.walletBalance)}`);
      }

      // Deduct balance
      user.walletBalance -= betAmt;
      await user.save();

      this.players[socket.id] = {
        userId: user._id,
        amount: betAmt,
        autoCashout: autoCO,
        cashed: false,
        socket
      };

      socket.emit("bet_placed", { amount: betAmt });

      console.log(`💰 Bet: ${user.name || user.phone} — KES ${betAmt}`);

    } catch (err) {
      console.error("addBet error:", err);
      socket.emit("error_msg", "Bet failed. Try again.");
    }
  }

  // ===================== CASHOUT =====================
  async cashout(socket, forcedMult = null) {
    const p = this.players[socket.id];

    if (!p || p.cashed) return;
    if (this.state !== "FLYING") return;

    p.cashed = true;

    const usedMult = forcedMult || this.multiplier;
    const payout = Math.floor(p.amount * usedMult);

    try {
      const user = await User.findById(p.userId);
      user.walletBalance += payout;
      await user.save();

      await Bet.create({
        userId: p.userId,
        amount: p.amount,
        multiplier: Number(usedMult.toFixed(2)),
        payout,
        result: "win"
      });

      socket.emit("cashout_success", {
        multiplier: Number(usedMult.toFixed(2)),
        payout
      });

      console.log(`🏆 Cashout: KES ${payout} at ${usedMult.toFixed(2)}x`);

    } catch (err) {
      console.error("Cashout error:", err);
    }
  }

  // ===================== CRASH =====================
  async _crash() {
    this.state = "CRASHED";

    const crashPt = Number(this.crashPoint.toFixed(2));

    this.io.emit("round_crash", { crashPoint: crashPt });

    console.log(`💥 Crash at ${crashPt}x`);

    // Save round to DB
    try {
      await GameRound.create({
        roundId: this.roundId,
        crashPoint: crashPt
      });
    } catch (err) {
      console.error("GameRound save error:", err);
    }

    // Mark all uncashed bets as losses
    const lossPromises = Object.entries(this.players)
      .filter(([, p]) => !p.cashed)
      .map(async ([id, p]) => {
        try {
          await Bet.create({
            userId: p.userId,
            amount: p.amount,
            multiplier: crashPt,
            payout: 0,
            result: "lose"
          });

          const sock = this.io.sockets.sockets.get(id);
          if (sock) sock.emit("bet_lost");

          console.log(`❌ Lost: KES ${p.amount}`);
        } catch (err) {
          console.error("Loss record error:", err);
        }
      });

    await Promise.all(lossPromises);

    // Restart after 5s pause
    setTimeout(() => {
      this.startWaiting();
    }, 5000);
  }
}

module.exports = RoundEngine;