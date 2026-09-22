
// ==================================================
// FILE: app.js
// ==================================================

require("dns").setDefaultResultOrder(
  "ipv4first"
);

require("dotenv").config();

const express =
  require("express");

const cors =
  require("cors");

const connectDB =
  require("./src/config/database");

const authRoutes =
  require("./src/routes/authRoutes");

const userRoutes =
  require("./src/routes/userRoutes");

const photoRoutes =
  require("./src/routes/photoRoutes");

const folderRoutes =
  require("./src/routes/folderRoutes");

const trashRoutes =
  require("./src/routes/trashRoutes");

const app =
  express();

// --------------------------------------------------
// CORS
// --------------------------------------------------

app.use(
  cors({
    origin: true,
    credentials: true,

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
  })
);

// --------------------------------------------------
// Body Parser
// --------------------------------------------------

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// --------------------------------------------------
// Health Check
// --------------------------------------------------

app.get(
  "/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "Photo App API is running",
    });
  }
);

// --------------------------------------------------
// Routes
// --------------------------------------------------

app.use(
  "/auth",
  authRoutes
);

app.use(
  "/user",
  userRoutes
);

app.use(
  "/folders",
  folderRoutes
);

app.use(
  "/photos",
  photoRoutes
);

app.use(
  "/trash",
  trashRoutes
);

// --------------------------------------------------
// 404 Handler
// --------------------------------------------------

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,
      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });
  }
);

// --------------------------------------------------
// Global Error Handler
// --------------------------------------------------

app.use(
  (err, req, res, next) => {
    console.error(
      "Global error:",
      err
    );

    const statusCode =
      err.statusCode ||
      err.status ||
      500;

    return res.status(
      statusCode
    ).json({
      success: false,

      message:
        err.message ||
        "Internal server error",
    });
  }
);

// --------------------------------------------------
// Local Development
//
// IMPORTANT:
// Lambda does NOT call connectDB().
// This is only for local Express development.
// --------------------------------------------------

if (
  require.main === module
) {
  const PORT =
    process.env.PORT || 5000;

  connectDB()
    .then(() => {
      app.listen(
        PORT,
        () => {
          console.log(
            `Server running on port ${PORT}`
          );
        }
      );
    })
    .catch(
      (error) => {
        console.error(
          "Failed to start server:",
          error
        );

        process.exit(1);
      }
    );
}

// --------------------------------------------------
// Export
// --------------------------------------------------

module.exports = app;
