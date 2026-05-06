// routes/authRoutes.js
const express = require("express");
const router  = express.Router();
const auth    = require("../controllers/authController");

router.post("/register",  auth.register);
router.post("/login",     auth.login);
router.post("/reset-pin", auth.resetPin);

// Legacy stub
router.post("/send-otp",  auth.sendOtp);

module.exports = router;