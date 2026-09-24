const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  uploadUrl,
  confirmUpload,
  getPhotos,
  deletePhoto,
  renamePhoto,
  movePhotoToFolder,
  downloadUrl,
} = require("../controllers/photoController");

const router =
  express.Router();

// ==================================================
// Upload
// ==================================================

router.post(
  "/upload-url",
  authMiddleware,
  uploadUrl,
);

router.post(
  "/confirm",
  authMiddleware,
  confirmUpload,
);

// ==================================================
// Get photos
// ==================================================

router.get(
  "/",
  authMiddleware,
  getPhotos,
);

// ==================================================
// Download URL
//
// IMPORTANT:
// Keep this BEFORE /:photoId
// ==================================================

router.get(
  "/download-url",
  authMiddleware,
  downloadUrl,
);

// ==================================================
// Move photo to folder
//
// IMPORTANT:
// Keep this BEFORE /:photoId
// ==================================================

router.patch(
  "/:photoId/folder",
  authMiddleware,
  movePhotoToFolder,
);

// ==================================================
// Rename photo
// ==================================================

router.patch(
  "/:photoId",
  authMiddleware,
  renamePhoto,
);

// ==================================================
// Move photo to Trash
//
// DELETE does NOT permanently delete.
// It only sets:
// isTrashed = true
// ==================================================

router.delete(
  "/:photoId",
  authMiddleware,
  deletePhoto,
);

module.exports = router;