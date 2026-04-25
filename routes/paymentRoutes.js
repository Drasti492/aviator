const express = require("express");
const router = express.Router();

const {
  stkPush,
  payheroCallback
} = require("../controllers/paymentController");

const auth = require("../middleware/auth");

// STK PUSH
router.post("/stk-push", auth, stkPush);

// CALLBACK (NO auth here!)
router.post("/callback", payheroCallback);

module.exports = router;