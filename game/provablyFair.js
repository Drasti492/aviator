const crypto = require("crypto");

// server seed (hidden)
let serverSeed = crypto.randomBytes(32).toString("hex");

// public hash shown to users BEFORE round starts
let serverSeedHash = crypto
  .createHash("sha256")
  .update(serverSeed)
  .digest("hex");

let nonce = 0;

function generateCrashPoint() {
  const hmac = crypto.createHmac("sha256", serverSeed);
  hmac.update(nonce.toString());

  const hash = hmac.digest("hex");

  const int = parseInt(hash.slice(0, 13), 16);
  const crash = Math.max(1, (100 / (int % 100)) );

  nonce++;

  return Math.min(crash, 100); // cap
}

function getPublicData() {
  return {
    serverSeedHash,
    nonce
  };
}

function rotateSeed() {
  serverSeed = crypto.randomBytes(32).toString("hex");
  serverSeedHash = crypto
    .createHash("sha256")
    .update(serverSeed)
    .digest("hex");
  nonce = 0;
}

module.exports = {
  generateCrashPoint,
  getPublicData,
  rotateSeed
};