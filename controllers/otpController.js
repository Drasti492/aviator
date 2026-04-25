const Otp = require("../models/Otp");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

// GENERATE OTP
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

    const code = generateOTP();

    await Otp.create({
      phone,
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 min
    });

    // 🔥 TEMP: log instead of SMS
    console.log("📲 OTP for", phone, "is", code);

    res.json({ message: "OTP sent" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "OTP failed" });
  }
};

// ================= VERIFY OTP =================
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, code, name } = req.body;

    const record = await Otp.findOne({ phone, code });

    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ find or create user
    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: name || "User"
      });
    }

    // DELETE OTP after use
    await Otp.deleteMany({ phone });

    const token = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, user });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Verification failed" });
  }
};