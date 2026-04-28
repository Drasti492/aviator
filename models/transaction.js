const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    phone: String,
    amount: Number,
    type: {
      type: String,
      enum: ["deposit", "withdraw"],
      required: true
    },
    reference: {
      type: String
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);