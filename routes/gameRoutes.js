const router = require("express").Router();
const provably = require("../game/provablyFair");

// TEMP in-memory fallback (until you build full DB history)
let gameHistory = [];

/**
 * Save round result (called internally by socket/game logic later)
 */
router.post("/push", (req, res) => {
  const { roundId, multiplier } = req.body;

  if (!roundId || !multiplier) {
    return res.status(400).json({ message: "Missing data" });
  }

  gameHistory.unshift({
    roundId,
    multiplier,
    time: new Date()
  });

  res.json({ success: true });
});

/**
 * Get history
 */
router.get("/history", (req, res) => {
  res.json(gameHistory.slice(0, 50));
});

/**
 * Provably fair endpoint
 */
router.get("/fair", (req, res) => {
  res.json(provably.getPublicData());
});

module.exports = router;