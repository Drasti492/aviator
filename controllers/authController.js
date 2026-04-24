const admin = require("../utils/firebaseAdmin");
const User = require("../models/user");
const jwt = require("jsonwebtoken");

exports.verifyFirebaseUser = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await admin.auth().verifyIdToken(token);

    const phone = decoded.phone_number;

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        phone,
        walletBalance: 0
      });
    }

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
    res.status(401).json({ message: "Invalid token" });
  }
};