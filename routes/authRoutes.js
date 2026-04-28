const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");

router.post("/send-otp", auth.sendOtp);
router.post("/register", auth.register);
router.post("/login", auth.login);
router.post("/reset-pin", auth.resetPin);

module.exports = router;