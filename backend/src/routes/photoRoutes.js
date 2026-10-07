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
  sendCopyPhoto,
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

// POST /photos/:photoId/caption
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
// This must be before /:photoId.

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
// SEND AS COPY
// ==================================================

// GET /photos/:photoId/copy
router.get(
  "/:photoId/copy",
  authMiddleware,
  sendCopyPhoto,
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
//
// isTrashed = true
//
// The S3 object remains.
// The DynamoDB record remains.
//
// Permanent deletion is handled by:
//
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
// Main Trash UI should use:
//
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
// The backend toggles the favorite state.
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