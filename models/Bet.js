const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  amount: Number,
  cashoutMultiplier: Number,
  payout: Number,
  status: {
    type: String,
    enum: ["pending", "won", "lost"],
    default: "pending"
  },
  roundId: String
}, { timestamps: true });

module.exports = mongoose.model("Bet", betSchema);