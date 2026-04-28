const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const RoundEngine = require("./game/roundEngine");

module.exports = function (server) {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  // ================= AUTH =================
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) return next();

      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next();
    }
  });

  // ================= ENGINE =================
  const game = new RoundEngine(io);

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    // SEND CURRENT STATE (important for mid-join)
    socket.emit("game_tick", {
      multiplier: game.multiplier
    });

    if (game.state === "WAITING") {
      socket.emit("round_waiting", {
        countdown: game.countdown
      });
    }

    if (game.state === "FLYING") {
      socket.emit("round_start");
    }

    // ================= PLACE BET =================
    socket.on("place_bet", async (data) => {

      if (!socket.user) {
        return socket.emit("error_msg", "Login required");
      }

      const amount = Number(data.amount);
      const autoCashout = Number(data.autoCashout);

      if (!amount || amount <= 0) {
        return socket.emit("error_msg", "Invalid amount");
      }

      const ok = await game.addBet(socket, {
        amount,
        autoCashout
      });

      if (!ok) {
        socket.emit("error_msg", "Bet rejected");
      }
    });

    // ================= CASHOUT =================
    socket.on("cashout", () => {
      game.cashout(socket);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });

  });
};