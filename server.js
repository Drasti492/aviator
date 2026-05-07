require("dotenv").config();
const express  = require("express");
const http     = require("http");
const mongoose = require("mongoose");
const cors     = require("cors");

const app = express();

const allowedOrigins = [
  "https://aviatrix-lemon.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:5500",
  "https://your-predictor-site.vercel.app"  // NEW — add your predictor URL here
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) callback(null, true);
    else callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true
}));
app.options("*", cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok", db: mongoose.connection.readyState }));

app.use("/api/auth",      require("./routes/authRoutes"));
app.use("/api/game",      require("./routes/gameRoutes"));
app.use("/api/wallet",    require("./routes/walletRoutes"));
app.use("/api/payment",   require("./routes/paymentRoutes"));
app.use("/api/admin",     require("./routes/adminRoutes"));
app.use("/api/stats",     require("./routes/statsRoutes"));
app.use("/api/bets",      require("./routes/betRoutes"));
app.use("/api/predictor", require("./routes/predictorRoutes")); // NEW

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => { console.error("❌ MongoDB FAILED:", err.message); process.exit(1); });

mongoose.connection.on("error", err => console.error("❌ MongoDB runtime error:", err.message));

const server = http.createServer(app);

// NEW — store engine on app so predictorRoutes can access it
const initSocket = require("./socket");
const engine = initSocket(server, app);  // pass app

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));