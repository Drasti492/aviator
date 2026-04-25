const router = require("express").Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { saveOTP, verifyOTP } = require("../utils/otpStore");
const { sendOTP } = require("../utils/smsService");
// =======================
// SEND OTP
// =======================

const otpStore = new Map();



router.post("/send-otp", async (req, res) => {
  try {
    let { phone } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone required" });

    phone = phone.replace(/\s/g, "");

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore.set(phone, {
      otp,
      expires: Date.now() + 5 * 60 * 1000
    });

    console.log(`📲 OTP for ${phone} is ${otp}`);

    // IMPORTANT
    await sendOTP(phone, otp);

    res.json({ success: true });

  } catch (err) {
    console.error("SEND OTP ERROR:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});


// VERIFY OTP

router.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    const record = otpStore.get(phone);

    if (!record) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (Date.now() > record.expires) {
      otpStore.delete(phone);
      return res.status(400).json({ message: "OTP expired" });
    }

    if (Number(otp) !== record.otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpStore.delete(phone);

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({ phone });
    }

    const token = jwt.sign(
      { id: user._id, phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

module.exports = router;