const express = require("express");
const router = express.Router();

const auth = require("../controllers/authController");

// ================= AUTH =================
router.post("/send-otp", auth.sendOtp);

// 👉 IMPORTANT: You DON'T have verifyOtp → remove or fix
// router.post("/verify-otp", auth.verifyOtp); ❌ REMOVE THIS

router.post("/register", auth.register);
router.post("/login", auth.login);

// ================= RESET =================
router.post("/forgot-password", auth.forgotPassword);

// 👉 FIX NAME (matches controller)
router.post("/reset-pin", auth.resetPin);

module.exports = router;