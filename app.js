const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// Imports
const { connectWhatsApp, getSocket, getQr, isConnected } = require("./src/services/whatsapp.service");
const authRoutes = require("./src/routes/auth.routes");
const whatsappRoutes = require("./src/routes/whatsapp.routes");
const jwt = require("jsonwebtoken");

const cookieParser = require("cookie-parser");

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api", whatsappRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Socket auth middleware
io.use((socket, next) => {
  let token = socket.handshake.auth.token;
  if (!token && socket.handshake.headers.cookie) {
    const match = socket.handshake.headers.cookie.match(/token=([^;]+)/);
    if (match) token = match[1];
  }

  if (!token) return next(new Error("Authentication error"));

  jwt.verify(token, process.env.JWT_SECRET || "super_secret_jwt_key_12345", (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.user = decoded;
    next();
  });
});

io.on("connection", async (socket) => {
  const userId = socket.user.id;
  const { User } = require("./src/db/pool");
  
  try {
    const user = await User.findByPk(userId);
    
    if (!user || user.payment_status !== 'approved') {
      socket.emit("payment_required", "يرجى تأكيد الدفع أولاً لتفعيل الخدمة");
      return;
    }

    socket.join(`user_${userId}`);
    connectWhatsApp(userId, io).then(() => {
      if (isConnected(userId)) {
        socket.emit("connected", "WhatsApp Connected");
      } else {
        const qr = getQr(userId);
        if (qr) socket.emit("qr", qr);
      }
    });
  } catch (err) {
    console.error("Socket connection error:", err);
  }
});

const { sequelize } = require("./src/db/pool");

// Protection Middleware for Pages
const protectPage = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    console.log("ProtectPage: No token cookie found");
    return res.redirect("/");
  }

  jwt.verify(token, process.env.JWT_SECRET || "super_secret_jwt_key_12345", (err, decoded) => {
    if (err) {
        console.log("ProtectPage: JWT verification failed", err.message);
        res.clearCookie("token", { path: "/" });
        res.clearCookie("isLoggedIn", { path: "/" });
        res.clearCookie("user", { path: "/" });
        return res.redirect("/");
    }
    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", protectPage, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/subscriptions", protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "subscriptions.html"));
});

app.get("/api-docs", protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "api.html"));
});

app.get("/contact", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/admin-messages", protectPage, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin-messages.html"));
});

// Static files (CSS, JS) with automatic .html extension support
app.use(express.static(path.join(__dirname, "public"), {
    extensions: ["html"]
}));

app.use((req, res) => {
    res.redirect("/");
});

async function startServer() {
  try {
    await sequelize.sync({ alter: true });
    console.log("Database & tables synced using Sequelize (altered)");

    // Seed Default Subscriptions
    const { Subscription } = require("./src/db/pool");
    const count = await Subscription.count();
    if (count === 0) {
      await Subscription.bulkCreate([
        { name: "الباقة المجانية", message_limit: 100, price: 0, duration_days: 30 },
        { name: "الباقة الأساسية", message_limit: 1000, price: 10, duration_days: 30 },
        { name: "الباقة المتقدمة", message_limit: 5000, price: 25, duration_days: 30 },
        { name: "الباقة الاحترافية", message_limit: 15000, price: 50, duration_days: 30 }
      ]);
      console.log("Default subscriptions created");
    }
    
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server Running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to sync database:", err);
  }
}

startServer();