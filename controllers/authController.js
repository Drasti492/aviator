const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { saveOTP, verifyOTP } = require("../utils/otpStore");
const { sendOTP } = require("../utils/smsService");

// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone required" });

    let user = await User.findOne({ phone });

    // OTP rate limit: 3 per 3 hours
    if (user && user.otpAttempts >= 3 && user.otpExpires && user.otpExpires > Date.now()) {
      return res.status(429).json({
        message: "Too many OTP requests. Try again later."
      });
    }

    // Reset window if expired
    if (user && (!user.otpExpires || user.otpExpires < Date.now())) {
      user.otpAttempts = 0;
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      saveOTP(phone, code);
    } catch (err) {
      return res.status(429).json({ message: err.message });
    }

    if (user) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      user.otpExpires = Date.now() + (3 * 60 * 60 * 1000);
      await user.save();
    }

    // Send OTP via Africa's Talking
    try {
      await sendOTP(phone, code);
    } catch (smsErr) {
      console.error("SMS error:", smsErr.message);
      // In dev, log OTP to console
      console.log(` OTP for ${phone}: ${code}`);
    }

    res.json({ message: "OTP sent" });

  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { phone, otp, name, pin } = req.body;

    if (!phone || !otp || !name || !pin) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!verifyOTP(phone, otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    let user = await User.findOne({ phone });

    const SIGNUP_BONUS = 30;

    if (user && user.bonusClaimed) {
      // Already registered properly — just update name/pin
      user.name = name;
      user.pin = pin;
      await user.save();
    } else if (user) {
      user.name = name;
      user.pin = pin;
      user.walletBalance += SIGNUP_BONUS;
      user.bonusClaimed = true;
      await user.save();
    } else {
      user = await User.create({
        phone,
        name,
        pin,
        walletBalance: SIGNUP_BONUS,
        bonusClaimed: true
      });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({ token, user: { name: user.name, phone: user.phone, walletBalance: user.walletBalance } });

  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN required" });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({ message: "Account not found" });
    }

    if (user.pin !== pin) {
      return res.status(400).json({ message: "Invalid PIN" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: { name: user.name, phone: user.phone, walletBalance: user.walletBalance }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

// ================= RESET PIN =================
exports.resetPin = async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;

    if (!phone || !otp || !newPin) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!verifyOTP(phone, otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const user = await User.findOne({ phone });

    if (!user) return res.status(404).json({ message: "Account not found" });

    user.pin = newPin;
    await user.save();

    res.json({ message: "PIN reset successful" });

  } catch (err) {
    console.error("Reset error:", err);
    res.status(500).json({ message: "Reset failed" });
  }
};