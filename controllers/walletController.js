const User = require("../models/user");
const Transaction = require("../models/transaction");

// GET WALLET
exports.getWallet = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ walletBalance: user.walletBalance });
};

// DEPOSIT (simple mock for now)
exports.deposit = async (req, res) => {
  const { amount } = req.body;

  await User.findByIdAndUpdate(req.user.id, {
    $inc: { walletBalance: amount }
  });

  res.json({ success: true });
};

// WITHDRAW
exports.withdraw = async (req, res) => {
  const { amount } = req.body;

  const user = await User.findById(req.user.id);

  if (user.walletBalance < amount) {
    return res.status(400).json({ message: "Insufficient balance" });
  }

  user.walletBalance -= amount;
  await user.save();

  res.json({ success: true });
};

// HISTORY (basic placeholder)
exports.history = async (req, res) => {
  const tx = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(tx);
};