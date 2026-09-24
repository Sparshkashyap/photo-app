require("dns").setDefaultResultOrder(
  "ipv4first",
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

const shareRoutes =
  require("./src/routes/shareRoutes");

const photoShareRoutes =
  require("./src/routes/photoShareRoutes");

const favoriteRoutes =
  require("./src/routes/favoriteRoutes");

const app =
  express();

// ==================================================
// CORS
// ==================================================

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
  }),
);

// ==================================================
// BODY PARSER
// ==================================================

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// ==================================================
// HEALTH
// ==================================================

app.get(
  "/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message:
        "Photo App API is running",
    });
  },
);

// ==================================================
// AUTH
// ==================================================

app.use(
  "/auth",
  authRoutes,
);

// ==================================================
// USER
// ==================================================

app.use(
  "/user",
  userRoutes,
);

// ==================================================
// FOLDERS
// ==================================================

app.use(
  "/folders",
  folderRoutes,
);

// ==================================================
// PHOTOS
// ==================================================

app.use(
  "/photos",
  photoRoutes,
);

// ==================================================
// BACKWARD COMPATIBLE PHOTO SHARE
// ==================================================

app.use(
  "/photos",
  photoShareRoutes,
);

// ==================================================
// TRASH
// ==================================================

app.use(
  "/trash",
  trashRoutes,
);

// ==================================================
// SHARE
// ==================================================
//
// POST   /share/:photoId
// GET    /share/:token
// DELETE /share/:photoId/:shareId
// ==================================================

app.use(
  "/share",
  shareRoutes,
);

// ==================================================
// FAVORITES
// ==================================================
//
// PATCH /favorites/:photoId/favorite
// ==================================================

app.use(
  "/favorites",
  favoriteRoutes,
);

// Backward-compatible favorite endpoint:
//
// PATCH /photos/:photoId/favorite

app.use(
  "/photos",
  favoriteRoutes,
);

// ==================================================
// 404
// ==================================================

app.use(
  (req, res) => {
    return res.status(404).json({
      success: false,

      message:
        `Route not found: ${req.method} ${req.originalUrl}`,
    });
  },
);

// ==================================================
// ERROR HANDLER
// ==================================================

app.use(
  (
    err,
    req,
    res,
    next,
  ) => {
    console.error(
      "Global error:",
      err,
    );

    const statusCode =
      err.statusCode ||
      err.status ||
      500;

    return res
      .status(statusCode)
      .json({
        success: false,

        message:
          err.message ||
          "Internal server error",
      });
  },
);

// ==================================================
// LOCAL DEVELOPMENT
// ==================================================

if (
  require.main === module
) {
  const PORT =
    process.env.PORT ||
    5000;

  connectDB()
    .then(() => {
      app.listen(
        PORT,
        () => {
          console.log(
            `Server running on port ${PORT}`,
          );
        },
      );
    })
    .catch(
      (error) => {
        console.error(
          "Failed to start server:",
          error,
        );

        process.exit(1);
      },
    );
}

module.exports = app;