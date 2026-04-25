const engine = require("./gameEngine");

class RoundEngine {
  constructor(io) {
    this.io = io;

    this.state = "WAITING";
    this.countdown = 10;
    this.multiplier = 1;
    this.crashPoint = 0;
    this.players = {};

    this.start();
  }

  start() {
    setInterval(() => this.tick(), 100);
  }

  tick() {

    // ================= WAITING =================
    if (this.state === "WAITING") {
      this.countdown--;

      this.io.emit("round_waiting", {
        countdown: this.countdown
      });

      if (this.countdown <= 0) {
        this.startRound();
      }

      return;
    }

    // ================= FLYING =================
    if (this.state === "FLYING") {

      this.multiplier += 0.02 + this.multiplier * 0.003;

      this.io.emit("game_tick", {
        multiplier: this.multiplier
      });

      // AUTO CASHOUT
      for (let id in this.players) {
        const p = this.players[id];

        if (!p.cashed && this.multiplier >= p.autoCashout) {
          const socket = this.io.sockets.sockets.get(id);
          if (socket) this.cashout(socket);
        }
      }

      // CRASH LOGIC (REALISTIC)
      if (this.multiplier >= this.crashPoint) {
        this.crash();
      }
    }
  }

  startRound() {
    this.state = "FLYING";
    this.multiplier = 1;
    this.crashPoint = engine.generateCrashPoint();
  }

  crash() {
    this.io.emit("round_crash", {
      crashPoint: this.crashPoint
    });

    // losers
    for (let id in this.players) {
      const p = this.players[id];
      if (!p.cashed) {
        // mark loss
      }
    }

    this.state = "CRASHED";

    setTimeout(() => {
      this.players = {};
      this.countdown = 10;
      this.state = "WAITING";
      this.io.emit("round_start");
    }, 10000); // 🔥 10 sec pause AFTER crash
  }

  addBet(socketId, betData) {
    if (this.state !== "WAITING") return false;

    this.players[socketId] = {
      ...betData,
      cashed: false
    };

    return true;
  }

  cashout(socket) {
    const p = this.players[socket.id];
    if (!p || p.cashed) return;

    p.cashed = true;

    socket.emit("cashout_success", {
      multiplier: this.multiplier,
      payout: p.amount * this.multiplier
    });
  }
}

module.exports = RoundEngine;