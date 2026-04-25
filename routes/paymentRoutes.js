const express = require("express");
const router = express.Router();

const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/auth");

// DEBUG SAFE CHECK
if (!paymentController.stkPush || !paymentController.payheroCallback) {
  throw new Error("Payment controller exports missing");
}

router.post("/stk-push", auth, paymentController.stkPush);
router.post("/callback", paymentController.payheroCallback);

module.exports = router;