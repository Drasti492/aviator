const User = require("../models/user");

exports.leaderboard = async (req, res) => {
  const top = await User.find()
    .sort({ walletBalance: -1 })
    .limit(10)
    .select("name walletBalance");

  res.json(top);
};

exports.myStats = async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    balance: user.walletBalance
  });
};