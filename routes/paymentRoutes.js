const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  stkPush,
  payheroCallback,
  paymentStatus
} = require("../controllers/paymentController");

// ================= ROUTES =================

// deposit
router.post("/stk-push", auth, stkPush);

// callback (NO AUTH)
router.post("/payhero-callback", payheroCallback);

// status check
router.get("/status/:reference", auth, paymentStatus);

module.exports = router;