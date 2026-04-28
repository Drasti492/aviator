const router = require("express").Router();
const provably = require("../game/provablyFair");
const GameRound = require("../models/GameRound");

// Get recent game history (last 50 rounds)
router.get("/history", async (req, res) => {
  try {
    const rounds = await GameRound.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .select("crashPoint createdAt");

    res.json(rounds);
  } catch {
    res.json([]);
  }
});

// Provably fair data
router.get("/fair", (req, res) => {
  res.json(provably.getPublicData());
});

module.exports = router;