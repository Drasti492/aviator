const router = require("express").Router();
const ctrl = require("../controllers/authController");

router.post("/send-otp", ctrl.sendOtp);
router.post("/verify-signup", ctrl.verifySignup);
router.post("/login", ctrl.login);
router.post("/request-reset", ctrl.requestReset);
router.post("/reset-pin", ctrl.resetPin);

module.exports = router;