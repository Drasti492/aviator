const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  phone: {
    type: String,
    unique: true
  },
  firebaseUid: String,
  walletBalance: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);