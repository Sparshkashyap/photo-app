
// ==================================================
// FILE: src/routes/trashRoutes.js
// ==================================================

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

// --------------------------------------------------
// Get all trashed photos
// GET /trash
// --------------------------------------------------

router.get(
  "/",
  authMiddleware,
  getTrashPhotos
);

// --------------------------------------------------
// Restore photo
// POST /trash/:photoId/restore
// --------------------------------------------------

router.post(
  "/:photoId/restore",
  authMiddleware,
  restorePhoto
);

// --------------------------------------------------
// Delete photo forever
// DELETE /trash/:photoId
// --------------------------------------------------

router.delete(
  "/:photoId",
  authMiddleware,
  deletePhotoForever
);

// --------------------------------------------------
// Empty entire trash
// DELETE /trash
// --------------------------------------------------

router.delete(
  "/",
  authMiddleware,
  emptyTrash
);

module.exports = router;