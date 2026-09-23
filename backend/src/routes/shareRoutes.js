const express =
  require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  createShareLink,
  getPublicShare,
  revokeShareLink,
} = require("../controllers/shareController");

const router =
  express.Router();

// ==================================================
// CREATE SHARE LINK
// POST /share
//
// Authentication required.
// ==================================================

router.post(
  "/",
  authMiddleware,
  createShareLink
);

// ==================================================
// PUBLIC SHARED PHOTO
// GET /share/:token
//
// Authentication NOT required.
//
// Anyone who has the valid share link can
// access the shared photo.
// ==================================================

router.get(
  "/:token",
  getPublicShare
);

// ==================================================
// REVOKE SHARE LINK
// DELETE /share/:token
//
// Authentication required.
//
// Only the owner who created the link can
// revoke it.
// ==================================================

router.delete(
  "/:token",
  authMiddleware,
  revokeShareLink
);

module.exports =
  router;