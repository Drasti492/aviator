const engine = require("./gameEngine");

class RoundEngine {
  constructor(io) {
    this.io = io;

    this.state = "WAITING";
    this.countdown = 10;

    this.multiplier = 1;
    this.crashPoint = 0;

    this.players = {};

    this.loop();
  }

  loop() {
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

      // CRASH
      if (this.multiplier >= this.crashPoint) {
        this.crash();
      }
    }
  }

  // ================= START ROUND =================
  startRound() {
    this.state = "FLYING";
    this.multiplier = 1;
    this.crashPoint = engine.generateCrashPoint();

    this.io.emit("round_start");
  }

  // ================= CRASH =================
  crash() {
    this.state = "CRASHED";

    this.io.emit("round_crash", {
      crashPoint: this.crashPoint
    });

    // mark losses
    for (let id in this.players) {
      const p = this.players[id];

      if (!p.cashed) {
        const socket = this.io.sockets.sockets.get(id);
        if (socket) {
          socket.emit("bet_lost");
        }
      }
    }

    // reset AFTER crash delay
    setTimeout(() => {
      this.players = {};
      this.countdown = 10;
      this.state = "WAITING";

      this.io.emit("round_waiting", { countdown: this.countdown });
    }, 10000);
  }

  // ================= BET =================
  addBet(socketId, betData) {
    if (this.state !== "WAITING") {
      return false;
    }

    this.players[socketId] = {
      ...betData,
      cashed: false
    };

    return true;
  }

  // ================= CASHOUT =================
  cashout(socket) {
    const p = this.players[socket.id];
    if (!p || p.cashed) return;

    p.cashed = true;

    const payout = Math.floor(p.amount * this.multiplier);

    socket.emit("cashout_success", {
      multiplier: this.multiplier,
      payout
    });
  }
}

module.exports = RoundEngine;