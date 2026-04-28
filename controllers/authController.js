const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { saveOTP, verifyOTP } = require("../utils/otpStore");

// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    saveOTP(phone, code);

    console.log("OTP:", code); // replace with SMS

    res.json({ message: "OTP sent" });

  } catch (err) {
    res.status(400).json({ message: err.message });
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
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({ token, user });

  } catch (err) {
    res.status(500).json({ message: "Register failed" });
  }
};

// ================= LOGIN =================
exports.login = async (req, res) => {
  const { phone, pin } = req.body;

  const user = await User.findOne({ phone });

  if (!user || user.pin !== pin) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

  res.json({ token, user });
};

// ================= FORGOT PASSWORD =================
exports.forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    saveOTP(phone, code);

    console.log("RESET OTP:", code);

    res.json({ message: "Reset OTP sent" });

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ================= RESET PIN =================
exports.resetPin = async (req, res) => {
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
};