const crypto = require("crypto");

class GameEngine {
  constructor() {
    this.serverSeed = this.generateSeed();
    this.clientSeed = "public-client";
    this.nonce = 0;

    // House edge (0.97 = 3% edge)
    this.HOUSE_EDGE = 0.97;
  }

  // 🔐 Generate secure server seed
  generateSeed() {
    return crypto.randomBytes(32).toString("hex");
  }

  // 🔓 Public hash (sent to frontend BEFORE round starts)
  getHashedServerSeed() {
    return crypto
      .createHash("sha256")
      .update(this.serverSeed)
      .digest("hex");
  }

  // 🎯 Generate crash multiplier (provably fair)
  generateCrashPoint() {
    this.nonce++;

    const hash = crypto
      .createHmac("sha256", this.serverSeed)
      .update(`${this.clientSeed}-${this.nonce}`)
      .digest("hex");

    // Convert part of hash → number
    const h = parseInt(hash.substring(0, 13), 16);

    // Avoid division by 0
    if (h % 100 === 0) return 1.0;

    // Crash formula with house edge
    const crash = Math.max(
      1,
      (100 / (h % 100)) * this.HOUSE_EDGE
    );

    return parseFloat(crash.toFixed(2));
  }

  // 🔁 Rotate seed after some rounds (security)
  rotateSeed() {
    this.serverSeed = this.generateSeed();
    this.nonce = 0;
  }

  // 📦 Public data for frontend verification
  getPublicData() {
    return {
      hashedServerSeed: this.getHashedServerSeed(),
      clientSeed: this.clientSeed,
      nonce: this.nonce
    };
  }

  // 🔍 Full verification (for admin or future UI)
  verifyCrash(serverSeed, clientSeed, nonce) {
    const hash = crypto
      .createHmac("sha256", serverSeed)
      .update(`${clientSeed}-${nonce}`)
      .digest("hex");

    const h = parseInt(hash.substring(0, 13), 16);

    if (h % 100 === 0) return 1.0;

    const crash = Math.max(
      1,
      (100 / (h % 100)) * this.HOUSE_EDGE
    );

    return parseFloat(crash.toFixed(2));
  }
}

module.exports = new GameEngine();