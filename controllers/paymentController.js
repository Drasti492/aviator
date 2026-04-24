const axios = require("axios");
const User = require("../models/user");
const Payment = require("../models/Payment");
const Transaction = require("../models/transaction");

// ============================
// STK PUSH (DEPOSIT)
// ============================
exports.stkPush = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ message: "Phone and amount required" });
    }

    const user = await User.findById(req.user._id);

    const reference = "DEP" + Date.now();

    // SAVE PAYMENT FIRST
    const payment = await Payment.create({
      user: user._id,
      phone,
      amount: Number(amount),
      type: "deposit",
      reference
    });

    // CALL PAYHERO
    const response = await axios.post(
      `${process.env.PAYHERO_BASE_URL}/api/v2/payments`,
      {
        amount: Number(amount),
        phone_number: phone,
        provider: "m-pesa",
        channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
        external_reference: reference,
        callback_url: process.env.PAYHERO_CALLBACK_URL,
        customer_name: "Aviator User"
      },
      {
        headers: {
          Authorization: `Basic ${process.env.PAYHERO_BASIC_AUTH}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({
      reference,
      checkoutUrl: response.data.checkout_url
    });

  } catch (err) {
    console.error("STK ERROR:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to initiate STK" });
  }
};

// ============================
// PAYHERO CALLBACK
// ============================
exports.payheroCallback = async (req, res) => {
  try {
    const ref = req.body?.response?.ExternalReference;
    const resultCode = req.body?.response?.ResultCode;

    if (!ref) return res.sendStatus(400);

    const payment = await Payment.findOne({ reference: ref }).populate("user");
    if (!payment) return res.sendStatus(404);

    // 🔒 PREVENT DOUBLE CREDIT
    if (payment.status !== "pending") {
      return res.sendStatus(200);
    }

    if (resultCode === 0) {
      payment.status = "success";
      await payment.save();

      const user = payment.user;

      // ✅ DEPOSIT
      if (payment.type === "deposit") {
        user.walletBalance += payment.amount;
      }

      // ✅ WITHDRAW
      if (payment.type === "withdraw") {
        user.walletBalance -= payment.amount;
      }

      await user.save();

      // SAVE TRANSACTION
      await Transaction.create({
        user: user._id,
        amount: payment.amount,
        type: payment.type,
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

// ============================
// STATUS CHECK (FOR FRONTEND POLLING)
// ============================
exports.paymentStatus = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      reference: req.params.reference,
      user: req.user._id
    });

    if (!payment) {
      return res.json({ status: "not_found" });
    }

    res.json({ status: payment.status });

  } catch {
    res.json({ status: "error" });
  }
};