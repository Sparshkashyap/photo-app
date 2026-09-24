const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  createShare,
  revokeShare,
} = require("../controllers/shareController");

const router =
  express.Router();

// ==================================================
// BACKWARD COMPATIBLE PHOTO SHARE ROUTES
// ==================================================
//
// POST
// /photos/:photoId/share
//
// DELETE
// /photos/:photoId/share/:shareId
//
// Canonical routes remain:
//
// POST
// /share/:photoId
//
// DELETE
// /share/:photoId/:shareId
//
// ==================================================

// --------------------------------------------------
// Create Share
// --------------------------------------------------

router.post(
  "/:photoId/share",
  authMiddleware,
  createShare,
);

// --------------------------------------------------
// Revoke Share
// --------------------------------------------------

router.delete(
  "/:photoId/share/:shareId",
  authMiddleware,
  revokeShare,
);

module.exports = router;