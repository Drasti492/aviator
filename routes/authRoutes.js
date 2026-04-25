const router = require("express").Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");

const { saveOTP, verifyOTP } = require("../utils/otpStore");

// =======================
// SEND OTP
// =======================
router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone required" });
    }

    // 🔢 Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 💾 Save
    saveOTP(phone, code);

    console.log("📲 OTP for", phone, "is", code); // TEMP

    // 👉 Later: send SMS here

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: "OTP send failed" });
  }
});


// =======================
// VERIFY OTP + LOGIN
// =======================
router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, code, name } = req.body;

    if (!verifyOTP(phone, code)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: name || "User"
      });
    }

    const token = jwt.sign(
      { id: user._id, phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user
    });

  } catch (err) {
    res.status(500).json({ message: "Verification failed" });
  }
});

module.exports = router;