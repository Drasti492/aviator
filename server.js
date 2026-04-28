require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// ===================== ROUTES =====================
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/game", require("./routes/gameRoutes"));
app.use("/api/wallet", require("./routes/walletRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/bets", require("./routes/betRoutes"));

// ===================== DATABASE =====================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

// ===================== HTTP + SOCKET =====================
const server = http.createServer(app);
require("./socket")(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Aviator server running on port ${PORT}`);
});