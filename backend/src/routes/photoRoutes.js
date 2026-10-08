const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  uploadUrl,
  confirmUpload,
  generateCaptionForPhoto,
  getPhotos,
  getPhoto,
  renamePhoto,
  updatePhotoCaption,
  movePhoto,
  downloadPhoto,
  trashPhoto,
  restorePhoto,
  toggleFavorite,
  getFavoritePhotos,
} = require("../controllers/photoController");

const router = express.Router();

// ==================================================
// UPLOAD
// ==================================================

// POST /photos/upload-url
router.post(
  "/upload-url",
  authMiddleware,
  uploadUrl,
);

// POST /photos/confirm
router.post(
  "/confirm",
  authMiddleware,
  confirmUpload,
);

// ==================================================
// AI CAPTION GENERATION
// ==================================================

// POST /photos/:photoId/caption
//
// Generates AI caption for the photo.
router.post(
  "/:photoId/caption",
  authMiddleware,
  generateCaptionForPhoto,
);

// ==================================================
// GET PHOTOS
// ==================================================

// GET /photos
router.get(
  "/",
  authMiddleware,
  getPhotos,
);

// ==================================================
// FAVORITES
// ==================================================

// IMPORTANT:
// This route must be before /:photoId.

router.get(
  "/favorites",
  authMiddleware,
  getFavoritePhotos,
);

// ==================================================
// DOWNLOAD
// ==================================================

// GET /photos/:photoId/download
//
// IMPORTANT:
// This route must be before /:photoId.

router.get(
  "/:photoId/download",
  authMiddleware,
  downloadPhoto,
);

// ==================================================
// GET SINGLE PHOTO
// ==================================================

// GET /photos/:photoId
router.get(
  "/:photoId",
  authMiddleware,
  getPhoto,
);

// ==================================================
// RENAME PHOTO
// ==================================================

// PATCH /photos/:photoId
router.patch(
  "/:photoId",
  authMiddleware,
  renamePhoto,
);

// ==================================================
// UPDATE PHOTO CAPTION
// ==================================================

// PATCH /photos/:photoId/caption
//
// Used when user manually edits an existing caption.

router.patch(
  "/:photoId/caption",
  authMiddleware,
  updatePhotoCaption,
);

// ==================================================
// MOVE PHOTO TO FOLDER
// ==================================================

// PATCH /photos/:photoId/folder
router.patch(
  "/:photoId/folder",
  authMiddleware,
  movePhoto,
);

// ==================================================
// MOVE PHOTO TO TRASH
// ==================================================

// PATCH /photos/:photoId/trash
//
// This does NOT permanently delete anything.
//
// It only sets:
// isTrashed = true
//
// S3 object remains.
// DynamoDB record remains.
//
// Permanent deletion is handled through:
// DELETE /trash/:photoId

router.patch(
  "/:photoId/trash",
  authMiddleware,
  trashPhoto,
);

// ==================================================
// RESTORE PHOTO
// ==================================================

// PATCH /photos/:photoId/restore
//
// Kept for backwards compatibility.
//
// Main Trash UI can use:
// POST /trash/:photoId/restore

router.patch(
  "/:photoId/restore",
  authMiddleware,
  restorePhoto,
);

// ==================================================
// FAVORITE
// ==================================================

// PATCH /photos/:photoId/favorite
//
// Backend toggles favorite state.
//
// Request body is not required.

router.patch(
  "/:photoId/favorite",
  authMiddleware,
  toggleFavorite,
);

// ==================================================
// IMPORTANT
// ==================================================
//
// DO NOT ADD:
//
// router.delete("/:photoId", ...)
//
// Permanent deletion is intentionally NOT available
// from /photos.
//
// Permanent deletion is ONLY available through:
//
// DELETE /trash/:photoId
//
// ==================================================

module.exports = router;