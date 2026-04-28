const router = require("express").Router();
const stats = require("../controllers/statsController");
const auth = require("../middleware/authMiddleware");

router.get("/leaderboard", stats.leaderboard);
router.get("/me", auth, stats.myStats);

module.exports = router;