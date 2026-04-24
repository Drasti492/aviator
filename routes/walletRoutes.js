const router = require("express").Router();
const walletController = require("../controllers/walletController");
const auth = require("../middleware/authMiddleware");

// GET WALLET
router.get("/me", auth, walletController.getWallet);

// DEPOSIT
router.post("/deposit", auth, walletController.deposit);

// WITHDRAW
router.post("/withdraw", auth, walletController.withdraw);

// HISTORY
router.get("/history", auth, walletController.history);

module.exports = router;