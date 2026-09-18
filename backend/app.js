require("dns").setDefaultResultOrder("ipv4first");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./src/config/database");

const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const photoRoutes = require("./src/routes/photoRoutes");
const folderRoutes = require("./src/routes/folderRoutes");

const app = express();

// --------------------------------------------------
// CORS
// --------------------------------------------------

app.use(
  cors({
    origin: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    credentials: true,
  })
);

// --------------------------------------------------
// Body Parser
// --------------------------------------------------

app.use(
  express.json({
    limit: "1mb",
  })
);

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Photo App API is running",
  });
});

// --------------------------------------------------
// Routes
// --------------------------------------------------

/*
 * Authentication
 *
 * POST /auth/signup
 * POST /auth/login
 */
app.use("/auth", authRoutes);

/*
 * User
 *
 * GET /user/profile
 */
app.use("/user", userRoutes);

app.use(
  "/folders",
  folderRoutes
);

/*
 * Photos
 *
 * POST  /photos/upload-url
 * POST  /photos/confirm
 * GET   /photos
 * GET   /photos/download-url
 * PATCH /photos/:photoId
 */
app.use("/photos", photoRoutes);

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("API Error:", err);

  return res.status(err.status || 500).json({
    success: false,
    message:
      err.message || "Internal server error",
  });
});

// --------------------------------------------------
// Local Development Server
// --------------------------------------------------

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
};

// --------------------------------------------------
// Start only when running directly
// --------------------------------------------------

if (require.main === module) {
  startServer();
}

// --------------------------------------------------
// Export Express App
// --------------------------------------------------

module.exports = app;