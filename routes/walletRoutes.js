const router = require("express").Router();
const ctrl = require("../controllers/walletController");
const auth = require("../middleware/auth");

router.get("/me", auth, ctrl.getWallet);
router.post("/withdraw", auth, ctrl.withdraw);
router.get("/history", auth, ctrl.history);

module.exports = router;