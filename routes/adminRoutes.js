const router = require("express").Router();
const admin = require("../controllers/adminController");

router.get("/withdrawals", admin.getWithdrawals);
router.post("/approve/:id", admin.approveWithdraw);

module.exports = router;