const axios = require("axios");
const User = require("../models/user");
const Payment = require("../models/Payment");
const Transaction = require("../models/transaction");

// ================= STK PUSH =================
const stkPush = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone required" });
    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Minimum deposit is 100" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const reference = "DEP_" + Date.now();

    await Payment.create({
      user: user._id,
      phone,
      amount: Math.floor(amount),
      type: "deposit",
      reference,
      status: "pending"
    });

    const response = await axios.post(
      `${process.env.PAYHERO_BASE_URL}/api/v2/payments`,
      {
        amount: Math.floor(amount),
        phone_number: phone,
        provider: "m-pesa",
        channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
        external_reference: reference,
        callback_url: process.env.PAYHERO_CALLBACK_URL,
        customer_name: user.name || "Aviator User"
      },
      {
        headers: {
          Authorization: `Basic ${process.env.PAYHERO_BASIC_AUTH}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      success: true,
      reference,
      checkoutUrl: response.data?.checkout_url
    });

  } catch (err) {
    console.error("STK ERROR:", err.response?.data || err.message);
    res.status(500).json({ message: "STK failed" });
  }
};

// ================= CALLBACK =================
const payheroCallback = async (req, res) => {
  try {
    const ref = req.body?.response?.ExternalReference;
    const code = req.body?.response?.ResultCode;

    if (!ref) return res.sendStatus(400);

    const payment = await Payment.findOne({ reference: ref }).populate("user");
    if (!payment) return res.sendStatus(404);

    if (payment.status !== "pending") return res.sendStatus(200);

    if (code === 0) {
      payment.status = "success";
      await payment.save();

      const user = payment.user;

      user.walletBalance =
        Math.floor((user.walletBalance || 0) + payment.amount);

      await user.save();

      await Transaction.create({
        user: user._id,
        amount: payment.amount,
        type: "deposit",
        status: "completed"
      });
    } else {
      payment.status = "failed";
      await payment.save();
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    res.sendStatus(500);
  }
};

// ================= EXPORTS (VERY IMPORTANT) =================
module.exports = {
  stkPush,
  payheroCallback
};