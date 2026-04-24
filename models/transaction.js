const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  phone: String,
  amount: Number,
  type: String,
  status: {
    type: String,
    default: "pending"
  },
  reference: String
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);