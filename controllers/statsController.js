// controllers/statsController.js
const User = require("../models/user");

exports.leaderboard = async (req, res) => {
  try {
    const top = await User.find()
      .sort({ walletBalance: -1 })
      .limit(10)
      .select("name walletBalance");
    res.json(top);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
};

exports.myStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ balance: user.walletBalance });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};