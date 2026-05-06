require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// At the top, replace:
app.use(cors({ origin: "*" }));

// With this:
const allowedOrigins = [
  "https://aviatrix-lemon.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500"  // if you test locally with Live Server
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// Also add this line BEFORE your routes to handle preflight:
app.options("*", cors());

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