const router = require("express").Router();
const { stkPush, payheroCallback } = require("../controllers/paymentController");
const auth = require("../middleware/auth");

router.post("/stk-push", auth, stkPush);
router.post("/callback", payheroCallback);

module.exports = router;