const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,

  phone: {
    type: String,
    unique: true,
    required: true
  },

  pin: {
    type: String,
    required: true
  },

  walletBalance: {
    type: Number,
    default: 0
  },

  // New user bonus flag
  bonusClaimed: {
    type: Boolean,
    default: false
  },

  // Has ever deposited (for withdrawal eligibility)
  hasDeposited: {
    type: Boolean,
    default: false
  },

  // OTP rate limiting
  otpAttempts: {
    type: Number,
    default: 0
  },

  otpExpires: {
    type: Date,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);