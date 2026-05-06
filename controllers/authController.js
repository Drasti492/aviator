// controllers/authController.js
// No OTP — phone number confirmed by double-entry on frontend
// Anti-spam: strict Kenyan phone format validation server-side

const jwt  = require("jsonwebtoken");
const User = require("../models/user");

// ================================================================
// PHONE VALIDATION — strict Kenyan numbers only
// Blocks: sequential (07123456789), repeated (07111111111),
//         known test patterns (0700000000, 0799999999 etc.)
// ================================================================
function validateKenyanPhone(phone) {
  // Must be exactly 254 + 9 digits (Kenyan format)
  if (!/^254(7\d{8}|1\d{8})$/.test(phone)) return false;

  const digits = phone.slice(3); // last 9 digits after 254

  // Block all-same digit: 000000000, 111111111 ...
  if (/^(\d)\1{8}$/.test(digits)) return false;

  // Block sequential ascending: 123456789
  let ascending = true, descending = true;
  for (let i = 1; i < digits.length; i++) {
    if (Number(digits[i]) !== Number(digits[i-1]) + 1) ascending  = false;
    if (Number(digits[i]) !== Number(digits[i-1]) - 1) descending = false;
  }
  if (ascending || descending) return false;

  // Block known dummy prefixes: 0700000, 0799999, 0712345, 0798765
  const known = [
    "700000000","700000001","711111111","722222222","733333333",
    "744444444","755555555","766666666","777777777","788888888",
    "799999999","712345678","723456789","798765432","787654321",
    "710000000","720000000","730000000","740000000","750000000",
    "760000000","770000000","780000000","790000000","100000000",
    "110000000","700123456","712300000","700111222"
  ];
  if (known.includes(digits)) return false;

  // Block if more than 5 consecutive same digits anywhere
  if (/(\d)\1{5,}/.test(digits)) return false;

  // Block first 5 digits all same
  if (/^(\d)\1{4}/.test(digits)) return false;

  return true;
}

// ================================================================
// REGISTER
// ================================================================
exports.register = async (req, res) => {
  try {
    const { phone, name, pin } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone number required" });
    if (!name  || name.trim().length < 2)
      return res.status(400).json({ message: "Enter your full name (at least 2 characters)" });
    if (!pin)  return res.status(400).json({ message: "PIN required" });

    if (!/^\d{4}$/.test(pin))
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });

    // Block sequential PINs: 1234, 2345, 9876 etc.
    const pinDigits = pin.split("").map(Number);
    let pinAsc = true, pinDesc = true;
    for (let i = 1; i < 4; i++) {
      if (pinDigits[i] !== pinDigits[i-1] + 1) pinAsc  = false;
      if (pinDigits[i] !== pinDigits[i-1] - 1) pinDesc = false;
    }
    if (pinAsc || pinDesc)
      return res.status(400).json({ message: "PIN too simple — avoid sequences like 1234 or 9876" });

    // Block all-same PIN: 0000, 1111 ...
    if (/^(\d)\1{3}$/.test(pin))
      return res.status(400).json({ message: "PIN too simple — avoid repeated digits like 1111" });

    const cleanPhone = phone.replace(/^\+/, "");
    if (!validateKenyanPhone(cleanPhone))
      return res.status(400).json({ message: "Enter a valid Kenyan phone number (07XX or 01XX)" });

    const existing = await User.findOne({ phone: cleanPhone });
    if (existing)
      return res.status(409).json({ message: "An account with this number already exists. Please sign in." });

    const BONUS = 30;
    const user  = await User.create({
      phone:         cleanPhone,
      name:          name.trim(),
      pin,
      walletBalance: BONUS,
      bonusClaimed:  true
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    console.log(`🆕 Registered: ${user.name} (${cleanPhone}) — KES ${BONUS} bonus`);

    res.json({
      token,
      user: { name: user.name, phone: user.phone, walletBalance: user.walletBalance }
    });

  } catch (err) {
    console.error("Register error:", err.message);
    res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

// ================================================================
// LOGIN
// ================================================================
exports.login = async (req, res) => {
  try {
    const { phone, pin } = req.body;

    if (!phone || !pin)
      return res.status(400).json({ message: "Phone and PIN required" });

    const cleanPhone = phone.replace(/^\+/, "");

    // Still validate format on login to avoid DB pollution
    if (!/^254(7\d{8}|1\d{8})$/.test(cleanPhone))
      return res.status(400).json({ message: "Invalid phone number format" });

    const user = await User.findOne({ phone: cleanPhone });

    if (!user)
      return res.status(400).json({ message: "No account found. Please sign up first." });

    if (user.pin !== pin)
      return res.status(400).json({ message: "Incorrect PIN. Please try again." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    console.log(`🔐 Login: ${user.name || cleanPhone}`);

    res.json({
      token,
      user: { name: user.name, phone: user.phone, walletBalance: user.walletBalance }
    });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ================================================================
// RESET PIN — no OTP, just re-verify phone exists + new PIN
// User must know their phone number; no proof of ownership beyond that.
// Upgrade this to OTP later when billing is sorted.
// ================================================================
exports.resetPin = async (req, res) => {
  try {
    const { phone, newPin } = req.body;

    if (!phone)  return res.status(400).json({ message: "Phone required" });
    if (!newPin) return res.status(400).json({ message: "New PIN required" });

    if (!/^\d{4}$/.test(newPin))
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });

    if (/^(\d)\1{3}$/.test(newPin))
      return res.status(400).json({ message: "PIN too simple" });

    const pinDigits = newPin.split("").map(Number);
    let asc = true, desc = true;
    for (let i = 1; i < 4; i++) {
      if (pinDigits[i] !== pinDigits[i-1] + 1) asc  = false;
      if (pinDigits[i] !== pinDigits[i-1] - 1) desc = false;
    }
    if (asc || desc)
      return res.status(400).json({ message: "PIN too simple — avoid sequences" });

    const cleanPhone = phone.replace(/^\+/, "");
    const user = await User.findOne({ phone: cleanPhone });

    if (!user)
      return res.status(404).json({ message: "No account found with that number." });

    user.pin = newPin;
    await user.save();

    console.log(`🔑 PIN reset: ${cleanPhone}`);
    res.json({ message: "PIN reset successful. Please sign in." });

  } catch (err) {
    console.error("Reset PIN error:", err.message);
    res.status(500).json({ message: "PIN reset failed. Please try again." });
  }
};

// Legacy stub — kept so old clients don't 404
exports.sendOtp = async (req, res) => {
  res.json({ message: "OTP not required. Use register or login directly." });
};