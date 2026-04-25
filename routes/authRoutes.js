const router = require("express").Router();
const admin = require("../utils/firebaseAdmin");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

// ✅ ONLY AUTH ENDPOINT (FIXED)
router.post("/phone-login", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No Firebase token" });
    }

    const decoded = await admin.auth().verifyIdToken(token);

    const phone = decoded.phone_number;

    if (!phone) {
      return res.status(400).json({ message: "No phone from Firebase" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: req.body.name || "User",
        walletBalance: 0
      });
    }

    const appToken = jwt.sign(
      { id: user._id, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: appToken,
      user
    });

  } catch (err) {
    console.log(err);
    res.status(401).json({ message: "Firebase verification failed" });
  }
});

module.exports = router;