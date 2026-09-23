const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  createShare,
  getSharedPhoto,
  revokeShare,
} = require("../controllers/shareController");

const router = express.Router();

// ==================================================
// CREATE SHARE LINK
// POST /share/:photoId
// Protected
// ==================================================

router.post(
  "/:photoId",
  authMiddleware,
  createShare,
);

// ==================================================
// PUBLIC SHARED PHOTO
// GET /share/:token
// Public
// ==================================================

router.get(
  "/:token",
  getSharedPhoto,
);

// ==================================================
// REVOKE SHARE LINK
// DELETE /share/:photoId/:shareId
// Protected
// ==================================================

router.delete(
  "/:photoId/:shareId",
  authMiddleware,
  revokeShare,
);

module.exports = router;