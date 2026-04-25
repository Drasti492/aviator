require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");

const socketInit = require("./socket");

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/game", require("./routes/gameRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB ERROR:", err.message);
    process.exit(1);
  });
// SERVER
const server = http.createServer(app);

// SOCKET
socketInit(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("🚀 Server running on " + PORT));