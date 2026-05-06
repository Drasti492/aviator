// controllers/walletController.js
const User        = require("../models/user");
const Transaction = require("../models/transaction");
const Payment     = require("../models/payment");

// ================= GET WALLET =================
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({
      walletBalance: Math.floor(user.walletBalance),
      bonusBalance:  Math.floor(user.bonusBalance  || 0),
      hasDeposited:  user.hasDeposited
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
};

// ================= WITHDRAW =================
exports.withdraw = async (req, res) => {
  try {
    const { amount, phone } = req.body;

    if (!phone)  return res.status(400).json({ message: "Phone number required" });
    if (!amount) return res.status(400).json({ message: "Amount required" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.hasDeposited)
      return res.status(400).json({ message: "You must make a deposit before withdrawing" });

    // Min withdrawal: KES 200 for real money, KES 400 for bonus-only balance
    const realMoney   = Math.max(0, user.walletBalance - (user.bonusBalance || 0));
    const minWithdraw = realMoney > 0 ? 200 : 400;

    if (amount < minWithdraw)
      return res.status(400).json({ message: `Minimum withdrawal is KES ${minWithdraw}` });

    if (user.walletBalance < amount)
      return res.status(400).json({ message: "Insufficient balance" });

    user.walletBalance -= amount;
    await user.save();

    const reference = "WTH_" + Date.now();

    await Payment.create({ user: user._id, phone, amount, type: "withdraw", reference, status: "pending" });
    await Transaction.create({ user: user._id, amount, type: "withdraw", status: "pending", reference, phone });

    res.json({ message: "Withdrawal request submitted. Funds will arrive shortly." });

  } catch (err) {
    console.error("Withdraw error:", err);
    res.status(500).json({ message: "Withdrawal failed" });
  }
};

// ================= HISTORY =================
exports.history = async (req, res) => {
  try {
    const tx = await Transaction
      .find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(tx);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
};