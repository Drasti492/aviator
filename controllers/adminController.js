// controllers/adminController.js
const User    = require("../models/user");
const Payment = require("../models/payment");
const axios   = require("axios");

exports.getWithdrawals = async (req, res) => {
  try {
    const data = await Payment.find({ type: "withdraw", status: "pending" }).populate("user");
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch withdrawals" });
  }
};

exports.approveWithdraw = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findById(id).populate("user");
    if (!payment) return res.status(404).json({ message: "Not found" });
    payment.status = "success";
    await payment.save();
    // B2C payout call
    await axios.post(process.env.B2C_URL, { phone: payment.phone, amount: payment.amount });
    res.json({ message: "Paid to user" });
  } catch (err) {
    res.status(500).json({ message: "Approval failed" });
  }
};