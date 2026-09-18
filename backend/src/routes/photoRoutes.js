const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  uploadUrl,
  confirmUpload,
  getPhotos,
  renamePhoto,
  downloadUrl,
} = require("../controllers/photoController");

const router = express.Router();

// --------------------------------------------------
// Upload
// --------------------------------------------------

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

// --------------------------------------------------
// Photos
// --------------------------------------------------

router.get(
  "/",
  authMiddleware,
  getPhotos,
);

// --------------------------------------------------
// Rename
// --------------------------------------------------

router.patch(
  "/:photoId",
  authMiddleware,
  renamePhoto,
);

// --------------------------------------------------
// Download
// --------------------------------------------------

router.get(
  "/download-url",
  authMiddleware,
  downloadUrl,
);

module.exports = router;