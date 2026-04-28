const jwt = require("jsonwebtoken");
const RoundEngine = require("./game/roundEngine");

module.exports = function (server) {
  const io = require("socket.io")(server, {
    cors: { origin: "*" }
  });

  const engine = new RoundEngine(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) return next();

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id };

      next();
    } catch {
      next();
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 Connected:", socket.id);

    socket.on("place_bet", (data) => {
      engine.addBet(socket, data);
    });

    socket.on("cashout", () => {
      engine.cashout(socket);
    });

    socket.on("disconnect", () => {
      console.log("🔴 Disconnected:", socket.id);
    });
  });
};