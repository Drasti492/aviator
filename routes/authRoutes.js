const router = require("express").Router();
const auth = require("../controllers/authController");

// ================= OTP =================
router.post("/send-otp", auth.sendOtp);
router.post("/verify-otp", auth.register);

// ================= LOGIN =================
router.post("/login", auth.login);

// ================= PASSWORD RESET =================
router.post("/forgot-password", auth.forgotPassword);
router.post("/reset-pin", auth.resetPin);

module.exports = router;