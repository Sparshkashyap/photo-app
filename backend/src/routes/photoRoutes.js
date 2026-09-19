const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  uploadUrl,
  confirmUpload,
  getPhotos,
  renamePhoto,
  movePhotoToFolder,
  downloadUrl,
} = require("../controllers/photoController");

const router =
  express.Router();

// --------------------------------------------------
// Upload
// --------------------------------------------------

router.post(
  "/upload-url",
  authMiddleware,
  uploadUrl
);

router.post(
  "/confirm",
  authMiddleware,
  confirmUpload
);

// --------------------------------------------------
// Get Photos
// --------------------------------------------------

router.get(
  "/",
  authMiddleware,
  getPhotos
);

// --------------------------------------------------
// Move Photo To Folder
// IMPORTANT: Keep this before /:photoId
// --------------------------------------------------

router.patch(
  "/:photoId/folder",
  authMiddleware,
  movePhotoToFolder
);

// --------------------------------------------------
// Rename Photo
// --------------------------------------------------

router.patch(
  "/:photoId",
  authMiddleware,
  renamePhoto
);

// --------------------------------------------------
// Download
// --------------------------------------------------

router.get(
  "/download-url",
  authMiddleware,
  downloadUrl
);

module.exports = router;