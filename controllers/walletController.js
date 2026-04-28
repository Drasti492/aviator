const User = require("../models/user");
const Transaction = require("../models/transaction");
const Payment = require("../models/payment");

// ================= GET WALLET =================
exports.getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      walletBalance: Math.floor(user.walletBalance),
      hasDeposited: user.hasDeposited
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch wallet" });
  }
};

// ================= WITHDRAW =================
exports.withdraw = async (req, res) => {
  try {
    const { amount, phone } = req.body;

    if (!amount || amount < 500) {
      return res.status(400).json({ message: "Minimum withdrawal is KES 500" });
    }

    if (!phone) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.hasDeposited) {
      return res.status(400).json({ message: "You must make a deposit before withdrawing" });
    }

    if (user.walletBalance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // Deduct balance immediately
    user.walletBalance -= amount;
    await user.save();

    const reference = "WTH_" + Date.now();

    // Create pending withdrawal
    await Payment.create({
      user: user._id,
      phone,
      amount,
      type: "withdraw",
      reference,
      status: "pending"
    });

    await Transaction.create({
      user: user._id,
      amount,
      type: "withdraw",
      status: "pending",
      reference,
      phone
    });

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