const router = require("express").Router();

// engine is attached to app in server.js
router.get("/next", (req, res) => {
  const engine = req.app.get("gameEngine");
  if (!engine) return res.status(503).json({ message: "Engine not ready" });

  res.json({
    currentState:    engine.state,
    nextCrash:       Number(engine.crashPoint.toFixed(2)),
    countdown:       engine.countdown,
    currentMult:     Number(engine.multiplier.toFixed(2)),
    roundId:         engine.roundId,
    history:         engine.crashHistory,
  });
});

module.exports = router;