const jwt  = require("jsonwebtoken");
const User = require("../models/user");

function validateKenyanPhone(phone) {
  if (!/^254(7\d{8}|1\d{8})$/.test(phone)) return false;
  const digits = phone.slice(3);
  if (/^(\d)\1{8}$/.test(digits)) return false;
  let ascending = true, descending = true;
  for (let i = 1; i < digits.length; i++) {
    if (Number(digits[i]) !== Number(digits[i-1]) + 1) ascending  = false;
    if (Number(digits[i]) !== Number(digits[i-1]) - 1) descending = false;
  }
  if (ascending || descending) return false;
  const known = [
    "700000000","700000001","711111111","722222222","733333333",
    "744444444","755555555","766666666","777777777","788888888",
    "799999999","712345678","723456789","798765432","787654321",
    "710000000","720000000","730000000","740000000","750000000",
    "760000000","770000000","780000000","790000000","100000000",
    "110000000","700123456","712300000","700111222"
  ];
  if (known.includes(digits)) return false;
  if (/(\d)\1{5,}/.test(digits)) return false;
  if (/^(\d)\1{4}/.test(digits)) return false;
  return true;
}

// ================================================================
// REGISTER
// ================================================================
exports.register = async (req, res) => {
  try {
    let { phone, name, pin } = req.body;

    // Basic presence checks
    if (!phone) return res.status(400).json({ message: "Phone number required" });
    if (!name || name.trim().length < 2)
      return res.status(400).json({ message: "Enter your full name (at least 2 characters)" });
    if (!pin) return res.status(400).json({ message: "PIN required" });

    // PIN validation
    if (!/^\d{4}$/.test(pin))
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });
    if (/^(\d)\1{3}$/.test(pin))
      return res.status(400).json({ message: "PIN too simple — avoid repeated digits like 1111" });
    const pd = pin.split("").map(Number);
    let pa = true, pde = true;
    for (let i = 1; i < 4; i++) {
      if (pd[i] !== pd[i-1]+1) pa  = false;
      if (pd[i] !== pd[i-1]-1) pde = false;
    }
    if (pa || pde)
      return res.status(400).json({ message: "PIN too simple — avoid sequences like 1234" });

    // Phone format
    const cleanPhone = phone.toString().replace(/^\+/, "").trim();
    if (!validateKenyanPhone(cleanPhone))
      return res.status(400).json({ message: "Enter a valid Kenyan phone number (07XX or 01XX)" });

    // Check duplicate — explicit log so you can see it in Render logs
    const existing = await User.findOne({ phone: cleanPhone });
    console.log(`🔍 Duplicate check for ${cleanPhone}:`, existing ? "FOUND" : "not found");
    if (existing)
      return res.status(409).json({ message: "An account with this number already exists. Please sign in." });

    const BONUS = 30;
    const user  = await User.create({
      phone:         cleanPhone,
      name:          name.trim(),
      pin,
      walletBalance: BONUS,
      bonusBalance:  BONUS,   // track bonus separately
      bonusClaimed:  true
    });

    console.log(`🆕 Saved to MongoDB: ${user.name} (${user.phone}) id=${user._id}`);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.status(201).json({
      token,
      user: { name: user.name, phone: user.phone, walletBalance: user.walletBalance }
    });

  } catch (err) {
    // Mongoose duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ message: "An account with this number already exists. Please sign in." });
    }
    console.error("Register error:", err.message);
    return res.status(500).json({ message: "Registration failed. Please try again." });
  }
};

// ================================================================
// LOGIN
// ================================================================
exports.login = async (req, res) => {
  try {
    let { phone, pin } = req.body;

    if (!phone || !pin)
      return res.status(400).json({ message: "Phone and PIN required" });

    const cleanPhone = phone.toString().replace(/^\+/, "").trim();

    if (!/^254(7\d{8}|1\d{8})$/.test(cleanPhone))
      return res.status(400).json({ message: "Invalid phone number format" });

    // MUST use .select("+pin") because we set select:false on pin
    const user = await User.findOne({ phone: cleanPhone }).select("+pin");
    console.log(`🔐 Login attempt: ${cleanPhone} — user found: ${!!user}`);

    if (!user)
      return res.status(400).json({ message: "No account found. Please sign up first." });

    if (user.pin !== pin)
      return res.status(400).json({ message: "Incorrect PIN. Please try again." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

    return res.json({
      token,
      user: { name: user.name, phone: user.phone, walletBalance: user.walletBalance }
    });

  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
};

// ================================================================
// RESET PIN
// ================================================================
exports.resetPin = async (req, res) => {
  try {
    let { phone, newPin } = req.body;

    if (!phone)  return res.status(400).json({ message: "Phone required" });
    if (!newPin) return res.status(400).json({ message: "New PIN required" });
    if (!/^\d{4}$/.test(newPin))
      return res.status(400).json({ message: "PIN must be exactly 4 digits" });
    if (/^(\d)\1{3}$/.test(newPin))
      return res.status(400).json({ message: "PIN too simple" });
    const pd = newPin.split("").map(Number);
    let a = true, d = true;
    for (let i = 1; i < 4; i++) {
      if (pd[i] !== pd[i-1]+1) a = false;
      if (pd[i] !== pd[i-1]-1) d = false;
    }
    if (a || d)
      return res.status(400).json({ message: "PIN too simple — avoid sequences" });

    const cleanPhone = phone.toString().replace(/^\+/, "").trim();
    const user = await User.findOne({ phone: cleanPhone });
    if (!user)
      return res.status(404).json({ message: "No account found with that number." });

    user.pin = newPin;
    await user.save();

    console.log(`🔑 PIN reset: ${cleanPhone}`);
    return res.json({ message: "PIN reset successful. Please sign in." });

  } catch (err) {
    console.error("Reset PIN error:", err.message);
    return res.status(500).json({ message: "PIN reset failed. Please try again." });
  }
};

exports.sendOtp = async (req, res) => {
  res.json({ message: "OTP not required." });
};