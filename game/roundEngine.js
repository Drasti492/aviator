class RoundEngine {
  constructor(io, engine) {
    this.io = io;
    this.engine = engine;

    this.state = "WAITING";
    this.countdown = 10;

    this.multiplier = 1;
    this.crashPoint = 0;

    this.players = new Map();
  }

  startLoop() {
    setInterval(() => {
      this.tick();
    }, 100);
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
      for (let [id, p] of this.players) {
        if (!p.cashed && this.multiplier >= p.autoCashout) {
          const socket = this.io.sockets.sockets.get(id);
          if (socket) this.cashout(socket);
        }
      }

      // CRASH
      if (this.multiplier >= this.crashPoint) {
        this.endRound();
      }
    }
  }

  startRound() {
    this.state = "FLYING";
    this.multiplier = 1;
    this.crashPoint = this.engine.generateCrashPoint();

    this.io.emit("round_start");
  }

  endRound() {
    this.io.emit("round_crash", {
      crashPoint: this.crashPoint
    });

    for (let [id, p] of this.players) {
      if (!p.cashed) {
        p.socket.emit("bet_lost");
      }
    }

    this.players.clear();

    this.state = "WAITING";
    this.countdown = 10;
  }

  placeBet(socket, bet) {
    if (this.state !== "WAITING") {
      return socket.emit("error_msg", "Wait for next round");
    }

    this.players.set(socket.id, {
      ...bet,
      socket,
      cashed: false
    });
  }

  async cashout(socket) {
    const p = this.players.get(socket.id);
    if (!p || p.cashed) return;

    const payout = p.amount * this.multiplier;

    p.cashed = true;

    socket.emit("cashout_success", {
      multiplier: this.multiplier,
      payout
    });
  }
}

module.exports = RoundEngine;