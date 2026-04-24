const { generateCrashPoint, getPublicData } = require("./provablyFair");
const GameRound = require("../models/GameRound");

let io;

let state = {
  multiplier: 1,
  flying: false,
  crashPoint: 2,
  players: [],
  roundId: null
};

function initSocket(socketServer) {
  io = socketServer;
}

function startNewRound() {
  state.multiplier = 1;
  state.crashPoint = generateCrashPoint();
  state.flying = true;
  state.players = [];

  state.roundId = Date.now();

  io.emit("round:start", {
    roundId: state.roundId,
    ...getPublicData()
  });
}

function tick() {
  if (!state.flying) return;

  state.multiplier += 0.02 + state.multiplier * 0.003;

  io.emit("multiplier", {
    multiplier: state.multiplier
  });

  // AUTO CASHOUT
  state.players.forEach(p => {
    if (!p.cashed && state.multiplier >= p.autoCashout) {
      cashoutPlayer(p);
    }
  });

  if (state.multiplier >= state.crashPoint) {
    crash();
  }
}

async function crash() {
  state.flying = false;

  io.emit("round:crash", {
    crashPoint: state.crashPoint
  });

  // save history
  await GameRound.create({
    roundId: state.roundId,
    crashPoint: state.crashPoint
  });

  setTimeout(startNewRound, 3000);
}

async function cashoutPlayer(player) {
  if (player.cashed) return;

  player.cashed = true;

  const win = player.amount * state.multiplier;

  // 🔥 UPDATE WALLET HERE
  const User = require("../models/user");
  await User.findByIdAndUpdate(player.userId, {
    $inc: { walletBalance: win }
  });

  io.to(player.socketId).emit("cashout:success", {
    multiplier: state.multiplier,
    win
  });
}

function placeBet(user, socketId, amount, autoCashout) {
  state.players.push({
    userId: user._id,
    socketId,
    amount,
    autoCashout,
    cashed: false
  });
}

function manualCashout(userId) {
  const player = state.players.find(p => p.userId == userId);
  if (player) cashoutPlayer(player);
}

// loop
setInterval(tick, 100);
setInterval(() => {
  if (!state.flying) startNewRound();
}, 2000);

module.exports = {
  initSocket,
  placeBet,
  manualCashout
};