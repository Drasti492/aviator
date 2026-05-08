const crypto = require("crypto");

let serverSeed = crypto.randomBytes(32).toString("hex");
let serverSeedHash = crypto
  .createHash("sha256")
  .update(serverSeed)
  .digest("hex");

let nonce = 0;

// Distribution:
//   7%  → 1.00x  (instant bust)
//  70%  → 1.01x – 1.50x
//  10%  → 1.51x – 1.99x
//   5%  → 2.00x – 2.49x
//   4%  → 2.50x – 3.00x
//   2%  → 3.01x – 4.00x
//   2%  → 4.01x – 30.00x
//
// CDF:
//   r < 0.07              → 1.00x
//   0.07 ≤ r < 0.77       → 1.01 – 1.50
//   0.77 ≤ r < 0.87       → 1.51 – 1.99
//   0.87 ≤ r < 0.92       → 2.00 – 2.49
//   0.92 ≤ r < 0.96       → 2.50 – 3.00
//   0.96 ≤ r < 0.98       → 3.01 – 4.00
//   0.98 ≤ r < 1.00       → 4.01 – 30.00

function generateCrashPoint() {
  const hmac = crypto.createHmac("sha256", serverSeed);
  hmac.update(nonce.toString());
  const hash = hmac.digest("hex");
  nonce++;

  const raw = parseInt(hash.slice(0, 8), 16);
  const r   = raw / 0x100000000;

  let crash;

  if (r < 0.07) {
    crash = 1.00;

  } else if (r < 0.77) {
    const t = (r - 0.07) / 0.70;
    crash = 1.01 + t * 0.49;

  } else if (r < 0.87) {
    const t = (r - 0.77) / 0.10;
    crash = 1.51 + t * 0.48;

  } else if (r < 0.92) {
    const t = (r - 0.87) / 0.05;
    crash = 2.00 + t * 0.49;

  } else if (r < 0.96) {
    const t = (r - 0.92) / 0.04;
    crash = 2.50 + t * 0.50;

  } else if (r < 0.98) {
    const t = (r - 0.96) / 0.02;
    crash = 3.01 + t * 0.99;

  } else {
    const t = (r - 0.98) / 0.02;
    crash = 4.01 + t * 25.99;
  }

  return Math.min(Math.max(Math.round(crash * 100) / 100, 1.00), 30.00);
}

function getPublicData() {
  return { serverSeedHash, nonce };
}

function rotateSeed() {
  serverSeed     = crypto.randomBytes(32).toString("hex");
  serverSeedHash = crypto
    .createHash("sha256")
    .update(serverSeed)
    .digest("hex");
  nonce = 0;
}

module.exports = { generateCrashPoint, getPublicData, rotateSeed };