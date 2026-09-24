const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  setFavorite,
} = require("../controllers/favoriteController");

const router =
  express.Router();

// ==================================================
// FAVORITE / UNFAVORITE PHOTO
// PATCH /favorites/:photoId/favorite
// ==================================================

router.patch(
  "/:photoId/favorite",
  authMiddleware,
  setFavorite,
);

module.exports = router;