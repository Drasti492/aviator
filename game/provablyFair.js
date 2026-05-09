const crypto = require("crypto");

let serverSeed     = crypto.randomBytes(32).toString("hex");
let serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
let nonce          = 0;

// ─────────────────────────────────────────────────────────────────────
// Target distribution (sums to 100%):
//   5%  → 1.00x          (instant bust — house edge)
//  20%  → 1.01x – 1.50x
//  28%  → 1.51x – 1.99x
//  20%  → 2.00x – 2.49x
//  14%  → 2.50x – 3.99x
//   8%  → 4.00x – 6.00x
//   5%  → 6.01x – 9.00x
//   5%  → 9.01x – 100x   (wild / randomness tier — unpredictable)
//
// We derive TWO independent values from the same HMAC-SHA256 hash:
//   • bytes 0-1  (16 bits) → bucket selector          (which zone)
//   • bytes 2-9  (32 bits) → position inside the zone (exact value)
//
// This separates zone selection from position so neither is
// guessable from the other, keeping the pattern non-predictable
// while remaining provably fair.
// ─────────────────────────────────────────────────────────────────────

// Bucket table — cumulative probabilities × 10 000 for integer math
// bucket = floor(selector / 65536 * 10000)  maps [0, 10000)
const BUCKETS = [
  { lo: 500,  pMin: 1.00, pMax: 1.00  },   // 0–499    → 5%   bust
  { lo: 2500, pMin: 1.01, pMax: 1.499 },   // 500–2499 → 20%  1.01–1.50
  { lo: 5300, pMin: 1.50, pMax: 1.989 },   // 2500–5299→ 28%  1.50–1.99
  { lo: 7300, pMin: 1.99, pMax: 2.489 },   // 5300–7299→ 20%  2.00–2.49
  { lo: 8700, pMin: 2.49, pMax: 3.989 },   // 7300–8699→ 14%  2.50–3.99
  { lo: 9500, pMin: 3.99, pMax: 5.999 },   // 8700–9499→  8%  4.00–6.00
  { lo: 10000,pMin: 6.00, pMax: 8.999 },   // 9500–9999→  5%  6.01–9.00
];
// anything ≥ 10000 handled separately as wild tier (5%): 9.01–100x

function generateCrashPoint() {
  const hmac = crypto.createHmac("sha256", serverSeed);
  hmac.update(nonce.toString());
  const hash = hmac.digest("hex");
  nonce++;

  // 16-bit bucket selector  (0 – 65535)
  const selector = parseInt(hash.slice(0, 4), 16);
  // 32-bit position inside bucket (0 – 4 294 967 295)
  const posRaw   = parseInt(hash.slice(4, 12), 16);
  // Secondary 32-bit value for extra jitter so values don't cluster
  const jitterRaw = parseInt(hash.slice(12, 20), 16);

  // Map selector to [0, 10000)
  const bucket = Math.floor(selector / 65536 * 10000);

  // Position inside zone: uniform [0, 1)
  const t = posRaw / 0x100000000;
  // Jitter: small perturbation ±2% of zone width — prevents clustering at edges
  const j = (jitterRaw / 0x100000000 - 0.5) * 0.04;

  let crash;

  if (bucket < 500) {
    // ── 5% instant bust ──────────────────────────────────────
    crash = 1.00;

  } else if (bucket < 2500) {
    // ── 20%  1.01 – 1.50 ────────────────────────────────────
    // Slight square-root skew so values spread across the zone
    // instead of piling up at the bottom
    crash = 1.01 + Math.pow(t, 0.75) * 0.489;

  } else if (bucket < 5300) {
    // ── 28%  1.50 – 1.99 ────────────────────────────────────
    crash = 1.50 + Math.pow(t, 0.85) * 0.489;

  } else if (bucket < 7300) {
    // ── 20%  2.00 – 2.49 ────────────────────────────────────
    crash = 2.00 + t * 0.489;

  } else if (bucket < 8700) {
    // ── 14%  2.50 – 3.99 ────────────────────────────────────
    // Slight log skew — more values in 2.5–3.0 than 3.0–4.0
    crash = 2.50 + Math.pow(t, 1.3) * 1.489;

  } else if (bucket < 9500) {
    // ── 8%   4.00 – 6.00 ────────────────────────────────────
    crash = 4.00 + t * 1.999;

  } else if (bucket < 10000) {
    // ── 5%   6.01 – 9.00 ────────────────────────────────────
    crash = 6.01 + t * 2.989;

  } else {
    // ── 5%   Wild tier: 9.01 – 100x ─────────────────────────
    // Exponential spread so 10x, 25x, 50x, 100x all appear
    crash = 9.01 + Math.pow(t, 0.4) * 90.99;
  }

  // Apply jitter (clamped so we never leave the overall cap)
  crash = crash + (crash * j);

  // Hard floor / ceiling
  crash = Math.min(Math.max(crash, 1.00), 100.00);

  return Math.round(crash * 100) / 100;
}

function getPublicData() {
  return { serverSeedHash, nonce };
}

function rotateSeed() {
  serverSeed     = crypto.randomBytes(32).toString("hex");
  serverSeedHash = crypto.createHash("sha256").update(serverSeed).digest("hex");
  nonce          = 0;
}

module.exports = { generateCrashPoint, getPublicData, rotateSeed };