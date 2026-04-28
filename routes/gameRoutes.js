const router = require("express").Router();
const ctrl = require("../controllers/gameController");
const provably = require("../game/provablyFair");

router.get("/history", ctrl.history);

router.get("/fair", (req, res) => {
  res.json(provably.getPublicData());
});

module.exports = router;