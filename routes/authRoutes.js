// routes/authRoutes.js
const express = require("express");
const router  = express.Router();
const auth    = require("../controllers/authController");

// Register new user (Firebase ID token proves phone ownership)
router.post("/register",  auth.register);

// Login with phone + PIN
router.post("/login",     auth.login);

// Reset PIN (Firebase ID token proves phone ownership)
router.post("/reset-pin", auth.resetPin);

// Legacy — kept so old clients don't 404
router.post("/send-otp",  auth.sendOtp);

module.exports = router;