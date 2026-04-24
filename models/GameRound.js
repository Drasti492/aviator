const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  roundId: Number,
  crashPoint: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("GameRound", schema);