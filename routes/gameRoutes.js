const router = require("express").Router();
const provably = require("../game/provablyFair");
const Bet = require("../models/Bet"); // make sure this exists

// ===============================
// GAME HISTORY (REAL FROM DB)
// ===============================
router.get("/history", async (req, res) => {
  try {
    const bets = await Bet.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(bets);
  } catch (err) {
    console.error("History error:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// PROVABLY FAIR DATA
router.get("/fair", (req, res) => {
  try {
    const data = provably.getPublicData();
    res.json(data);
  } catch (err) {
    console.error("Fair error:", err);
    res.status(500).json({ error: "Provably fair error" });
  }
});

module.exports = router;