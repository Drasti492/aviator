const User = require("../models/user");

exports.getWallet = async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    walletBalance: user.walletBalance
  });
};