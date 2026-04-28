const crypto = require("crypto");

let serverSeed = crypto.randomBytes(32).toString("hex");
let nonce = 0;

function generateCrashPoint() {
  const hash = crypto
    .createHmac("sha256", serverSeed)
    .update(nonce.toString())
    .digest("hex");

  const int = parseInt(hash.slice(0, 13), 16);

  let crash = 100 / (int % 100);

  nonce++;

  crash = Math.max(1, crash);
  crash = Math.min(crash, 50); // cap

  return Number(crash.toFixed(2));
}

module.exports = { generateCrashPoint };