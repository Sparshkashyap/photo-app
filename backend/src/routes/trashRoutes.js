const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  getTrashPhotos,
  restorePhoto,
  deletePhotoForever,
  emptyTrash,
} = require("../controllers/trashController");

const router =
  express.Router();

// ==================================================
// GET ALL TRASHED PHOTOS
// GET /trash
// ==================================================

router.get(
  "/",
  authMiddleware,
  getTrashPhotos,
);

// ==================================================
// RESTORE PHOTO
// POST /trash/:photoId/restore
// ==================================================

router.post(
  "/:photoId/restore",
  authMiddleware,
  restorePhoto,
);

// ==================================================
// PERMANENT DELETE ONE PHOTO
// DELETE /trash/:photoId
// ==================================================

router.delete(
  "/:photoId",
  authMiddleware,
  deletePhotoForever,
);

// ==================================================
// EMPTY ENTIRE TRASH
// DELETE /trash
// ==================================================

router.delete(
  "/",
  authMiddleware,
  emptyTrash,
);

// ==================================================
// EXPORT
// ==================================================

module.exports =
  router;