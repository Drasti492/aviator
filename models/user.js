// models/user.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },

  phone: {
    type: String,
    unique: true,
    required: true,
    index: true
  },

  pin: {
    type: String,
    required: true
  },

  walletBalance: {
    type: Number,
    default: 0
  },

  // Tracks bonus portion of balance (signup bonus etc.)
  bonusBalance: {
    type: Number,
    default: 0
  },

  bonusClaimed: {
    type: Boolean,
    default: false
  },

  hasDeposited: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);