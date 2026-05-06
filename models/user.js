const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: {
    type: String,
    unique: true,
    required: true,
    index: true,
    trim: true
  },
  pin: {
    type: String,
    required: true,
    select: false  // never leak PIN in queries
  },
  walletBalance: { type: Number, default: 0 },
  bonusBalance:  { type: Number, default: 0 },
  bonusClaimed:  { type: Boolean, default: false },
  hasDeposited:  { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);