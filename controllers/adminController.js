const User = require("../models/user");
const Payment = require("../models/Payment");
const axios = require("axios");

// ================= GET PENDING =================
exports.getWithdrawals = async (req, res) => {
  const data = await Payment.find({ type: "withdraw", status: "pending" }).populate("user");
  res.json(data);
};

// ================= APPROVE =================
exports.approveWithdraw = async (req, res) => {
  const { id } = req.params;

  const payment = await Payment.findById(id).populate("user");

  if (!payment) return res.status(404).json({ message: "Not found" });

  payment.status = "success";
  await payment.save();

  // 🔥 B2C API CALL HERE
  await axios.post(process.env.B2C_URL, {
    phone: payment.phone,
    amount: payment.amount
  });

  res.json({ message: "Paid to user" });
};