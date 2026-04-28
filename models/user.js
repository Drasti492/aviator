const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  phone: { type: String, unique: true },
  pin: { type: String }, // 🔐 4 digit PIN
  walletBalance: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);