const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { saveOTP, verifyOTP } = require("../utils/otpStore");

// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone, pin: "0000" }); // temp
    }

    // 🚫 OTP LIMIT: 3 PER 3 HOURS
    if (user.otpAttempts >= 3 && user.otpExpires && user.otpExpires > Date.now()) {
      return res.status(429).json({
        message: "Too many OTP requests. Try again later."
      });
    }

    // RESET if expired
    if (!user.otpExpires || user.otpExpires < Date.now()) {
      user.otpAttempts = 0;
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    saveOTP(phone, code);

    user.otpAttempts += 1;
    user.otpExpires = Date.now() + (3 * 60 * 60 * 1000); // 3hrs
    await user.save();

    console.log("OTP:", code);

    res.json({ message: "OTP sent" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================= REGISTER =================
exports.register = async (req, res) => {
  try {
    const { phone, otp, name, pin } = req.body;

    if (!verifyOTP(phone, otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!pin || pin.length !== 4) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone, name, pin });
    } else {
      user.name = name;
      user.pin = pin;
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ token, user });

  } catch {
    res.status(500).json({ message: "Register failed" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    const user = await User.findOne({ phone });

    if (!user || user.pin !== pin) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ token, user });

  } catch {
    res.status(500).json({ message: "Login failed" });
  }
};

// ================= RESET PASSWORD =================
exports.resetPin = async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;

    if (!verifyOTP(phone, otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (!newPin || newPin.length !== 4) {
      return res.status(400).json({ message: "PIN must be 4 digits" });
    }

    const user = await User.findOne({ phone });

    if (!user) return res.status(404).json({ message: "User not found" });

    user.pin = newPin;
    await user.save();

    res.json({ message: "PIN reset successful" });

  } catch {
    res.status(500).json({ message: "Reset failed" });
  }
};