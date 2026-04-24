const crypto = require("crypto");
const User = require("../models/user");

class Game {
  constructor(io) {
    this.io = io;

    this.bets = new Map();
    this.multiplier = 1;
    this.running = false;

    this.serverSeed = this.generateSeed();
    this.crashPoint = this.generateCrash();

    this.startLoop();
  }

  generateSeed() {
    return crypto.randomBytes(32).toString("hex");
  }

  hashSeed(seed) {
    return crypto.createHash("sha256").update(seed).digest("hex");
  }

  generateCrash() {
    const hash = this.hashSeed(this.serverSeed);

    const num = parseInt(hash.slice(0, 8), 16);
    const crash = Math.max(1.01, (num % 1000) / 100);

    return crash;
  }

  startLoop() {
    setInterval(() => this.tick(), 100);
  }

  async tick() {
    if (!this.running) {
      this.startRound();
      return;
    }

    this.multiplier += 0.02 + this.multiplier * 0.003;

    this.io.emit("game_tick", {
      multiplier: this.multiplier
    });

    // AUTO CASHOUT
    for (let [userId, bet] of this.bets) {
      if (!bet.cashed && this.multiplier >= bet.autoCashout) {
        await this.handleCashout(userId);
      }
    }

    if (this.multiplier >= this.crashPoint) {
      this.crash();
    }
  }

  startRound() {
    this.running = true;
    this.multiplier = 1;

    this.io.emit("round_start", {
      hash: this.hashSeed(this.serverSeed) // 🔐 show hash BEFORE round
    });
  }

  async crash() {
    this.running = false;

    this.io.emit("round_crash", {
      crashPoint: this.crashPoint,
      serverSeed: this.serverSeed // 🔥 reveal AFTER crash
    });

    // RESET
    this.bets.clear();
    this.serverSeed = this.generateSeed();
    this.crashPoint = this.generateCrash();
  }

  async placeBet(userId, data, socket) {
    const user = await User.findById(userId);

    if (!user) return socket.emit("error_msg", "User not found");

    if (user.walletBalance < data.amount) {
      return socket.emit("error_msg", "Insufficient balance");
    }

    if (this.running) {
      return socket.emit("error_msg", "Round already started");
    }

    // 💰 DEDUCT MONEY
    user.walletBalance -= data.amount;
    await user.save();

    this.bets.set(userId, {
      amount: data.amount,
      autoCashout: data.autoCashout,
      cashed: false
    });

    socket.emit("bet_placed");
  }

  async handleCashout(userId) {
    const bet = this.bets.get(userId);
    if (!bet || bet.cashed) return;

    const user = await User.findById(userId);

    const win = bet.amount * this.multiplier;

    user.walletBalance += win;
    await user.save();

    bet.cashed = true;

    this.io.to(userId).emit("cashout_success", {
      multiplier: this.multiplier,
      win
    });
  }

  async cashout(userId, socket) {
    if (!this.running) return;

    await this.handleCashout(userId);
  }
}

module.exports = Game;