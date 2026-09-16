require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./src/config/database");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const photoRoutes = require("./src/routes/photoRoutes");

const app = express();

// -------------------------
// Middleware
// -------------------------

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "1mb" }));

// -------------------------
// Health Check
// -------------------------

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Photo App API is running",
  });
});

// -------------------------
// Routes
// -------------------------

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/photos", photoRoutes);

// -------------------------
// Error Handler
// -------------------------

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

// -------------------------
// Local Server
// -------------------------

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server");
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;