const router = require("express").Router();
const auth = require("../middleware/authMiddleware");

const {
  stkPush,
  payheroCallback,
  paymentStatus
} = require("../controllers/paymentController");

router.post("/stk-push", auth, stkPush);
router.post("/payhero-callback", payheroCallback);
router.get("/status/:reference", auth, paymentStatus);

module.exports = router;