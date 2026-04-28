const { generateCrashPoint } = require("./provablyFair");
const User = require("../models/user");
const Bet = require("../models/Bet");

class RoundEngine {
  constructor(io) {
    this.io = io;

    this.state = "WAITING";
    this.countdown = 10;

    this.multiplier = 1;
    this.crashPoint = 0;

    this.players = {}; // socket.id -> bet

    this.startLoops();
  }

  startLoops() {
    setInterval(() => this.waitingTick(), 1000);
    setInterval(() => this.flyingTick(), 100);
  }

  // ================= WAITING =================
  waitingTick() {
    if (this.state !== "WAITING") return;

    this.countdown--;

    this.io.emit("round_waiting", {
      countdown: this.countdown
    });

    if (this.countdown <= 0) {
      this.startRound();
    }
  }

  // ================= START =================
  startRound() {
    this.state = "FLYING";
    this.multiplier = 1;

    this.crashPoint = generateCrashPoint();

    this.io.emit("round_start", {
      crashHash: "provably-fair-enabled"
    });
  }

  // ================= FLYING =================
  async flyingTick() {
    if (this.state !== "FLYING") return;

    this.multiplier += 0.02 + this.multiplier * 0.002;

    const currentMult = Number(this.multiplier.toFixed(2));

    this.io.emit("game_tick", {
      multiplier: currentMult
    });

    // ===== AUTO CASHOUT =====
    for (let id in this.players) {
      const p = this.players[id];

      if (!p.cashed && p.autoCashout > 0 && currentMult >= p.autoCashout) {
        const socket = this.io.sockets.sockets.get(id);
        if (socket) await this.cashout(socket, p.autoCashout);
      }
    }

    // ===== CRASH =====
    if (currentMult >= this.crashPoint) {
      await this.crash();
    }
  }

  // ================= PLACE BET =================
  async addBet(socket, { amount, autoCashout }) {
    if (this.state !== "WAITING") {
      socket.emit("error_msg", "Round already started");
      return;
    }

    if (this.players[socket.id]) {
      socket.emit("error_msg", "Bet already placed");
      return;
    }

    const user = await User.findById(socket.user.id);

    if (!user || user.walletBalance < amount) {
      socket.emit("error_msg", "Insufficient balance");
      return;
    }

    user.walletBalance -= amount;
    await user.save();

    this.players[socket.id] = {
      userId: user._id,
      amount,
      autoCashout,
      cashed: false
    };

    socket.emit("bet_placed", { amount });
  }

  // ================= CASHOUT =================
  async cashout(socket, forcedMultiplier = null) {
    const p = this.players[socket.id];

    if (!p || p.cashed) return;
    if (this.state !== "FLYING") return;

    p.cashed = true;

    const usedMult = forcedMultiplier || this.multiplier;
    const payout = Math.floor(p.amount * usedMult);

    const user = await User.findById(p.userId);
    user.walletBalance += payout;
    await user.save();

    // ✅ SAVE WIN
    await Bet.create({
      userId: p.userId,
      amount: p.amount,
      multiplier: usedMult,
      payout,
      result: "win"
    });

    socket.emit("cashout_success", {
      multiplier: Number(usedMult.toFixed(2)),
      payout
    });
  }

  // ================= CRASH =================
  async crash() {
    this.state = "CRASHED";

    this.io.emit("round_crash", {
      crashPoint: this.crashPoint
    });

    // ===== SAVE LOSSES =====
    for (let id in this.players) {
      const p = this.players[id];

      if (!p.cashed) {
        await Bet.create({
          userId: p.userId,
          amount: p.amount,
          multiplier: this.crashPoint,
          payout: 0,
          result: "lose"
        });

        const socket = this.io.sockets.sockets.get(id);
        if (socket) socket.emit("bet_lost");
      }
    }

    // RESET
    setTimeout(() => {
      this.players = {};
      this.countdown = 10;
      this.state = "WAITING";
    }, 5000);
  }
}

module.exports = RoundEngine;