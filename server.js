require("dotenv").config();
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const socketInit = require("./socket");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"));

app.use("/api/game", require("./routes/gameRoutes"));

const server = http.createServer(app);

// SOCKET
socketInit(server);

server.listen(3000, () => console.log("Server running"));