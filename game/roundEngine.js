const engine = require("./engine");
const User = require("../models/user");

class RoundEngine {
  constructor(io) {
    this.io = io;

    this.state = "WAITING"; // WAITING | FLYING | CRASHED
    this.countdown = 10;

    this.multiplier = 1;
    this.crashPoint = 0;

    this.players = {}; // socketId → bet

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
    this.crashPoint = engine.generateCrashPoint();

    this.io.emit("round_start");
  }

  // ================= FLYING =================
  flyingTick() {
    if (this.state !== "FLYING") return;

    this.multiplier += 0.015 + this.multiplier * 0.0025;

    this.io.emit("game_tick", {
      multiplier: Number(this.multiplier.toFixed(2))
    });

    // AUTO CASHOUT
    for (let id in this.players) {
      const p = this.players[id];

      if (!p.cashed && this.multiplier >= p.autoCashout) {
        const socket = this.io.sockets.sockets.get(id);
        if (socket) this.cashout(socket);
      }
    }

    // CRASH
    if (this.multiplier >= this.crashPoint) {
      this.crash();
    }
  }

  // ================= CRASH =================
  crash() {
    this.state = "CRASHED";

    this.io.emit("round_crash", {
      crashPoint: this.crashPoint
    });

    // mark losers
    for (let id in this.players) {
      const p = this.players[id];

      if (!p.cashed) {
        const socket = this.io.sockets.sockets.get(id);
        if (socket) socket.emit("bet_lost");
      }
    }

    // WAIT 5 SECONDS THEN RESET
    setTimeout(() => {
      this.players = {};
      this.countdown = 10;
      this.state = "WAITING";

      this.io.emit("round_waiting", {
        countdown: this.countdown
      });

    }, 5000);
  }

  // ================= PLACE BET =================
  async addBet(socket, { amount, autoCashout }) {
    if (this.state !== "WAITING") return false;

    if (this.players[socket.id]) return false; // already bet

    const user = await User.findById(socket.user.id);

    if (!user || user.walletBalance < amount) {
      socket.emit("error_msg", "Insufficient balance");
      return false;
    }

    // deduct balance
    user.walletBalance -= amount;
    await user.save();

    this.players[socket.id] = {
      userId: user._id,
      amount,
      autoCashout,
      cashed: false
    };

    socket.emit("bet_placed", { amount });

    return true;
  }

  // ================= CASHOUT =================
  async cashout(socket) {
    const p = this.players[socket.id];

    if (!p || p.cashed) return;

    if (this.state !== "FLYING") return;

    p.cashed = true;

    const win = Math.floor(p.amount * this.multiplier);

    // update wallet
    const user = await User.findById(p.userId);
    user.walletBalance += win;
    await user.save();

    socket.emit("cashout_success", {
      multiplier: Number(this.multiplier.toFixed(2)),
      payout: win
    });
  }
}

module.exports = RoundEngine;