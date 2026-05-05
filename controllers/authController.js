// controllers/authController.js
// Firebase Phone Auth — replaces Africa's Talking OTP completely
// No smsService, no otpStore — Firebase handles all OTP delivery

const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { verifyFirebaseToken } = require("../utils/firebaseAdmin");

// ================================================================
// REGISTER
// Flow: Frontend sends OTP via Firebase → user enters code →
//       Firebase returns ID token → frontend sends token here →
//       we verify token → create account
// ================================================================
exports.register = async (req, res) => {
  try {
    const { phone, name, pin, firebaseIdToken } = req.body;

    // Validate inputs
    if (!phone)           return res.status(400).json({ message: "Phone number required" });
    if (!name)            return res.status(400).json({ message: "Name required" });
    if (!pin)             return res.status(400).json({ message: "PIN required" });
    if (!firebaseIdToken) return res.status(400).json({ message: "Phone verification required" });

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });
    }

    // Verify Firebase ID token — proves user received and confirmed OTP
    let decoded;
    try {
      decoded = await verifyFirebaseToken(firebaseIdToken);
    } catch (fbErr) {
      console.error("Firebase verify failed:", fbErr.message);
      return res.status(401).json({ message: "Phone verification failed. Please verify your number again." });
    }

    // Firebase gives phone as +254XXXXXXXXX — our DB stores as 254XXXXXXXXX
    const firebasePhone = (decoded.phone_number || "").replace(/^\+/, "");
    const submittedPhone = phone.replace(/^\+/, "");

    // Security: ensure the verified phone matches what was submitted
    if (firebasePhone !== submittedPhone) {
      console.warn(`Phone mismatch: firebase=${firebasePhone} submitted=${submittedPhone}`);
      return res.status(401).json({ message: "Phone number does not match verification. Please try again." });
    }

    const SIGNUP_BONUS = 30;
    let user = await User.findOne({ phone: submittedPhone });

    if (user && user.bonusClaimed) {
      // Already registered — update name and PIN only
      user.name = name;
      user.pin  = pin;
      await user.save();
      console.log(`🔄 Account updated: ${submittedPhone}`);
    } else if (user) {
      // Exists but bonus not claimed
      user.name          = name;
      user.pin           = pin;
      user.walletBalance += SIGNUP_BONUS;
      user.bonusClaimed  = true;
      await user.save();
      console.log(`🎁 Bonus claimed: ${submittedPhone}`);
    } else {
      // New user
      user = await User.create({
        phone:         submittedPhone,
        name,
        pin,
        walletBalance: SIGNUP_BONUS,
        bonusClaimed:  true
      });
      console.log(`🆕 New user: ${name} (${submittedPhone}) — KES ${SIGNUP_BONUS} bonus`);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.json({
      token,
      user: {
        name:          user.name,
        phone:         user.phone,
        walletBalance: user.walletBalance
      }
    });

  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

// ================================================================
// LOGIN — phone + PIN only, no OTP needed for login
// ================================================================
exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin) {
      return res.status(400).json({ message: "Phone and PIN required" });
    }

    const cleanPhone = phone.replace(/^\+/, "");
    const user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      return res.status(400).json({ message: "Account not found. Please sign up first." });
    }

    if (user.pin !== pin) {
      return res.status(400).json({ message: "Incorrect PIN. Try again." });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    console.log(`🔐 Login: ${user.name || cleanPhone}`);

    res.json({
      token,
      user: {
        name:          user.name,
        phone:         user.phone,
        walletBalance: user.walletBalance
      }
    });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ================================================================
// RESET PIN — verify Firebase token → update PIN
// ================================================================
exports.resetPin = async (req, res) => {
  try {
    const { phone, newPin, firebaseIdToken } = req.body;

    if (!phone)           return res.status(400).json({ message: "Phone required" });
    if (!newPin)          return res.status(400).json({ message: "New PIN required" });
    if (!firebaseIdToken) return res.status(400).json({ message: "Phone verification required" });

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });
    }

    // Verify Firebase token
    let decoded;
    try {
      decoded = await verifyFirebaseToken(firebaseIdToken);
    } catch (fbErr) {
      console.error("Firebase verify failed:", fbErr.message);
      return res.status(401).json({ message: "Phone verification failed. Please verify again." });
    }

    const firebasePhone  = (decoded.phone_number || "").replace(/^\+/, "");
    const submittedPhone = phone.replace(/^\+/, "");

    if (firebasePhone !== submittedPhone) {
      return res.status(401).json({ message: "Phone number mismatch." });
    }

    const user = await User.findOne({ phone: submittedPhone });
    if (!user) {
      return res.status(404).json({ message: "Account not found." });
    }

    user.pin = newPin;
    await user.save();

    console.log(`🔑 PIN reset: ${submittedPhone}`);
    res.json({ message: "PIN reset successful. Please sign in." });

  } catch (err) {
    console.error("Reset PIN error:", err.message);
    res.status(500).json({ message: "PIN reset failed. Please try again." });
  }
};

// ================================================================
// SEND OTP — kept for compatibility but no longer used
// Firebase handles OTP on the frontend now
// ================================================================
exports.sendOtp = async (req, res) => {
  res.json({
    message: "OTP is now handled by Firebase on the frontend. No server OTP needed."
  });
};