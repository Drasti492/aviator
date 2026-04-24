const router = require("express").Router();
const admin = require("../utils/firebaseAdmin");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

router.post("/phone-login", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    // 🔥 VERIFY FIREBASE TOKEN
    const decoded = await admin.auth().verifyIdToken(token);

    const phone = decoded.phone_number;

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        name: req.body.name || "User"
      });
    }

    // CREATE YOUR APP TOKEN
    const appToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token: appToken,
      user
    });

  } catch (err) {
    res.status(401).json({ message: "Invalid Firebase token" });
  }
});

module.exports = router;