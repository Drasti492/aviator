const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Game = require("./gameEngine");

module.exports = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" }
  });

  const game = new Game(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
  const userId = socket.user.id;

  socket.join(userId); // 🔥 IMPORTANT

  socket.on("place_bet", (data) => {
    game.placeBet(userId, data, socket);
  });

  socket.on("cashout", () => {
    game.cashout(userId, socket);
  });
});
};