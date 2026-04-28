const express = require("express");
const router = express.Router();

const Bet = require("../models/Bet");
const auth = require("../middleware/auth"); // your JWT middleware

// ================= MY BET HISTORY =================
router.get("/my", auth, async (req, res) => {
  try {
    const bets = await Bet.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(bets);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

module.exports = router;