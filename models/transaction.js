const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  amount: Number,
  type: {
    type: String,
    enum: ["deposit", "withdraw", "bet", "win"]
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending"
  },
  reference: String
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);