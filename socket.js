const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const RoundEngine = require("./game/roundEngine");

module.exports = function (server) {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  // auth
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

  // ENGINE
  const game = new RoundEngine(io);

  io.on("connection", (socket) => {

   socket.on("place_bet", (data) => {
  if (!socket.user) {
    return socket.emit("error_msg", "Login required");
  }

  const ok = game.addBet(socket.id, {
    amount: Number(data.amount),
    autoCashout: Number(data.autoCashout)
  });

  if (!ok) {
    return socket.emit("error_msg", "Wait for next round");
  }

  socket.emit("bet_placed", {
    amount: data.amount
  });
});

    socket.on("cashout", () => {
      game.cashout(socket);
    });

  });
};