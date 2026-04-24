const crypto = require("crypto");

class GameEngine {
  constructor() {
    this.serverSeed = this.generateSeed();
    this.clientSeed = "public-client";
    this.nonce = 0;
  }

  generateSeed() {
    return crypto.randomBytes(32).toString("hex");
  }

  getHash() {
    return crypto
      .createHash("sha256")
      .update(this.serverSeed)
      .digest("hex");
  }

  generateCrashPoint() {
    this.nonce++;

    const hash = crypto
      .createHmac("sha256", this.serverSeed)
      .update(this.clientSeed + "-" + this.nonce)
      .digest("hex");

    const h = parseInt(hash.substring(0, 13), 16);

    const crash = Math.max(1, (100 / (h % 100)) * 0.99);

    return parseFloat(crash.toFixed(2));
  }

  rotateSeed() {
    this.serverSeed = this.generateSeed();
    this.nonce = 0;
  }
}

module.exports = new GameEngine();