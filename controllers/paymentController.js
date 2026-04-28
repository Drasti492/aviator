const axios = require("axios");
const User = require("../models/user");
const Payment = require("../models/payment");
const Transaction = require("../models/transaction");

// ================= STK PUSH =================
exports.stkPush = async (req, res) => {
  try {
    const { phone, amount } = req.body;

    if (!phone) return res.status(400).json({ message: "Phone required" });
    if (!amount || amount < 100) {
      return res.status(400).json({ message: "Minimum deposit is KES 100" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const reference = "DEP_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5).toUpperCase();

    // Save pending payment
    await Payment.create({
      user: user._id,
      phone,
      amount,
      type: "deposit",
      reference,
      status: "pending"
    });

    await Transaction.create({
      user: user._id,
      amount,
      type: "deposit",
      status: "pending",
      reference,
      phone
    });

    // Call PayHero STK API
    const response = await axios.post(
      `${process.env.PAYHERO_BASE_URL}/api/v2/payments`,
      {
        amount: Number(amount),
        phone_number: phone,
        channel_id: Number(process.env.PAYHERO_CHANNEL_ID),
        provider: "m-pesa",
        external_reference: reference,
        callback_url: process.env.PAYHERO_CALLBACK_URL
      },
      {
        headers: {
          Authorization: `Basic ${process.env.PAYHERO_BASIC_AUTH}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    res.json({
      message: "STK sent. Check your phone.",
      reference
    });

  } catch (err) {
    console.error("STK ERROR:", err.response?.data || err.message);
    res.status(500).json({ message: "Failed to initiate payment. Try again." });
  }
};

// ================= CHECK STATUS (polling) =================
exports.checkStatus = async (req, res) => {
  try {
    const { reference } = req.params;

    const payment = await Payment.findOne({
      reference,
      user: req.user.id
    });

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json({ status: payment.status, amount: payment.amount });

  } catch (err) {
    res.status(500).json({ message: "Status check failed" });
  }
};

// ================= PAYHERO CALLBACK =================
exports.payheroCallback = async (req, res) => {
  try {
    const body = req.body;

    // PayHero sends result in response object
    const ref = body?.response?.ExternalReference || body?.ExternalReference;
    const code = body?.response?.ResultCode ?? body?.ResultCode;

    console.log("📩 PayHero callback:", JSON.stringify(body).slice(0, 300));

    if (!ref) return res.sendStatus(400);

    const payment = await Payment.findOne({ reference: ref }).populate("user");
    if (!payment) return res.sendStatus(404);

    if (payment.status !== "pending") return res.sendStatus(200); // Already processed

    const tx = await Transaction.findOne({ reference: ref });

    if (code === 0 || code === "0") {
      // SUCCESS
      payment.status = "success";
      await payment.save();

      const user = payment.user;
      user.walletBalance += Number(payment.amount);
      user.hasDeposited = true;
      await user.save();

      if (tx) { tx.status = "completed"; await tx.save(); }

      console.log(`✅ Deposit success: ${ref} — KES ${payment.amount} → ${user.phone}`);

    } else {
      // FAILED
      payment.status = "failed";
      await payment.save();

      if (tx) { tx.status = "failed"; await tx.save(); }

      console.log(`❌ Deposit failed: ${ref} code=${code}`);
    }

    res.sendStatus(200);

  } catch (err) {
    console.error("CALLBACK ERROR:", err);
    res.sendStatus(500);
  }
};