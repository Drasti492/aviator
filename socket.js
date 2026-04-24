const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Game = require("./gameEngine");
const User = require("./models/user");
const Bet = require("./models/Bet");

module.exports = function(server) {
  const io = new Server(server, {
    cors: {
      origin: "*"
    }
  });

  let multiplier = 1;
  let crashPoint = engine.generateCrashPoint();
  let roundId = Date.now().toString();

  const players = {};

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;

      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {

    // ===== PLACE BET =====
    socket.on("place_bet", async ({ amount, autoCashout }) => {
      try {
        if (!socket.user) {
          return socket.emit("error_msg", "Login required");
        }

        const user = await User.findById(socket.user.id);

        if (!user || user.walletBalance < amount) {
          return socket.emit("error_msg", "Insufficient balance");
        }

        // 💥 DEDUCT BEFORE ROUND
        user.walletBalance -= amount;
        await user.save();

        const bet = await Bet.create({
          user: user._id,
          amount,
          status: "pending",
          roundId
        });

        players[socket.id] = {
          betId: bet._id,
          amount,
          autoCashout,
          cashed: false
        };

        socket.emit("bet_placed", { amount });

        io.emit("live_bet", {
          phone: user.phone,
          amount
        });

      } catch {
        socket.emit("error_msg", "Bet failed");
      }
    });

    // ===== CASHOUT =====
    socket.on("cashout", async () => {
      const p = players[socket.id];
      if (!p || p.cashed) return;

      await handleCashout(socket, multiplier);
    });

    socket.on("disconnect", () => {
      delete players[socket.id];
    });
  });

  // ===== GAME LOOP =====
  setInterval(async () => {
    multiplier += 0.02;

    io.emit("game_tick", { multiplier });

    // AUTO CASHOUT
    for (let id in players) {
      const p = players[id];

      if (!p.cashed && multiplier >= p.autoCashout) {
        const socket = io.sockets.sockets.get(id);
        if (socket) {
          await handleCashout(socket, multiplier);
        }
      }
    }

    // CRASH
    if (multiplier >= crashPoint) {

      io.emit("round_crash", { crashPoint });

      // MARK LOSERS
      for (let id in players) {
        const p = players[id];

        if (!p.cashed) {
          await Bet.findByIdAndUpdate(p.betId, {
            status: "lost"
          });
        }
      }

      // RESET ROUND
      multiplier = 1;
      crashPoint = engine.generateCrashPoint();
      roundId = Date.now().toString();

      for (let id in players) delete players[id];

      setTimeout(() => {
        io.emit("round_start");
      }, 2000);
    }

  }, 100);

  // ===== CASHOUT FUNCTION =====
  async function handleCashout(socket, mult) {
    const p = players[socket.id];
    if (!p || p.cashed) return;

    const bet = await Bet.findById(p.betId);
    const user = await User.findById(socket.user.id);

    const payout = p.amount * mult;

    user.walletBalance += payout;
    await user.save();

    bet.status = "won";
    bet.cashoutMultiplier = mult;
    bet.payout = payout;
    await bet.save();

    p.cashed = true;

    socket.emit("cashout_success", {
      multiplier: mult,
      payout
    });
  }
};