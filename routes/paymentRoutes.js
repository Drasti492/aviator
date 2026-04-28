const router = require("express").Router();
const ctrl = require("../controllers/paymentController");
const auth = require("../middleware/auth");

router.post("/stk", auth, ctrl.stkPush);
router.get("/status/:reference", auth, ctrl.checkStatus);
router.post("/callback", ctrl.payheroCallback);

module.exports = router;