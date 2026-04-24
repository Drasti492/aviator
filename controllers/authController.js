const User = require("../models/user");
const jwt = require("jsonwebtoken");

exports.phoneLogin = async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone required" });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = await User.create({
        name,
        phone
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user
    });

  } catch (error) {
    res.status(500).json({
      message: "Login failed"
    });
  }
};