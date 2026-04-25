const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { saveOTP, verifyOTP, getLastSent } = require("../utils/otpStore");

// ================= GENERATE OTP =================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ================= SEND OTP =================
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone required" });
    }

    // 🚨 ANTI-SPAM CHECK
    const lastSent = getLastSent(phone);

    if (lastSent && Date.now() - lastSent < 30000) {
      return res.status(429).json({
        message: "Wait 30 seconds before retrying"
      });
    }

    const code = generateOTP();

    // save in memory store
    saveOTP(phone, code);

    // TEMP SMS LOG
    console.log("📲 OTP for", phone, "is", code);

    res.json({ message: "OTP sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "OTP failed" });
  }
};

// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code, name } = req.body;

    const isValid = verifyOTP(phone, code);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: name || "User",
        walletBalance: 0
      });
    }

    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification failed" });
  }
};