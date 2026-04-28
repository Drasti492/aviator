const mongoose = require("mongoose");

const betSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  amount: Number,
  multiplier: Number,
  result: String, // "win" or "lose"
  payout: Number
}, { timestamps: true });

module.exports = mongoose.model("Bet", betSchema);