const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { getWallet, withdraw } = require("../controllers/walletController");

router.get("/me", auth, getWallet);
router.post("/withdraw", auth, withdraw);

module.exports = router;