const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  uploadUrl,
  confirmUpload,
  getPhotos,
  getPhoto,
  renamePhoto,
  movePhoto,
  downloadPhoto,
  trashPhoto,
  restorePhoto,
  deletePhoto,
  toggleFavorite,
  getFavoritePhotos,
} = require("../controllers/photoController");

const router = express.Router();

// ==================================================
// Upload
// ==================================================

// POST /photos/upload-url
router.post(
  "/upload-url",
  authMiddleware,
  uploadUrl
);

// POST /photos/confirm
router.post(
  "/confirm",
  authMiddleware,
  confirmUpload
);

// ==================================================
// Get photos
// ==================================================

// GET /photos
router.get(
  "/",
  authMiddleware,
  getPhotos
);

// GET /photos/favorites
//
// IMPORTANT:
// Keep this BEFORE /:photoId
// ==================================================

router.get(
  "/favorites",
  authMiddleware,
  getFavoritePhotos
);

// ==================================================
// Get single photo
//
// GET /photos/:photoId
//
// IMPORTANT:
// Dynamic /:photoId routes should come AFTER
// fixed routes like /favorites.
// ==================================================

router.get(
  "/:photoId",
  authMiddleware,
  getPhoto
);

// ==================================================
// Download photo
//
// GET /photos/:photoId/download
//
// IMPORTANT:
// This route must be BEFORE /:photoId
// ==================================================

router.get(
  "/:photoId/download",
  authMiddleware,
  downloadPhoto
);

// ==================================================
// Rename photo
//
// PATCH /photos/:photoId
// ==================================================

router.patch(
  "/:photoId",
  authMiddleware,
  renamePhoto
);

// ==================================================
// Move photo to folder
//
// PATCH /photos/:photoId/folder
// ==================================================

router.patch(
  "/:photoId/folder",
  authMiddleware,
  movePhoto
);

// ==================================================
// Move photo to trash
//
// PATCH /photos/:photoId/trash
// ==================================================

router.patch(
  "/:photoId/trash",
  authMiddleware,
  trashPhoto
);

// ==================================================
// Restore photo from trash
//
// PATCH /photos/:photoId/restore
// ==================================================

router.patch(
  "/:photoId/restore",
  authMiddleware,
  restorePhoto
);

// ==================================================
// Toggle favorite
//
// PATCH /photos/:photoId/favorite
// ==================================================

router.patch(
  "/:photoId/favorite",
  authMiddleware,
  toggleFavorite
);

// ==================================================
// Permanently delete photo
//
// DELETE /photos/:photoId
// ==================================================

router.delete(
  "/:photoId",
  authMiddleware,
  deletePhoto
);

// ==================================================
// Export
// ==================================================

module.exports = router;