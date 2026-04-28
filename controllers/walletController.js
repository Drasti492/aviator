const User = require("../models/user");
const Transaction = require("../models/transaction");

// ================= GET WALLET =================
exports.getWallet = async (req, res) => {
  const user = await User.findById(req.user.id);

  res.json({
    walletBalance: Math.floor(user.walletBalance)
  });
};

// ================= WITHDRAW =================
exports.withdraw = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Minimum withdraw is 100" });
    }

    const user = await User.findById(req.user.id);

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    user.walletBalance -= amount;
    await user.save();

    await Transaction.create({
      user: user._id,
      amount,
      type: "withdraw",
      status: "completed"
    });

    res.json({ message: "Withdraw successful" });

  } catch (err) {
    res.status(500).json({ message: "Withdraw failed" });
  }
};

// ================= HISTORY =================
exports.history = async (req, res) => {
  const tx = await Transaction
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json(tx);
};