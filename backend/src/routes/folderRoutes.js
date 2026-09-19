const express = require("express");

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
} = require("../controllers/folderController");

const router =
  express.Router();

// --------------------------------------------------
// Create Folder
// POST /folders
// --------------------------------------------------

router.post(
  "/",
  authMiddleware,
  createFolder
);

// --------------------------------------------------
// Get Current User Folders
// GET /folders
// --------------------------------------------------

router.get(
  "/",
  authMiddleware,
  getFolders
);

// --------------------------------------------------
// Rename Folder
// PATCH /folders/:folderId
// --------------------------------------------------

router.patch(
  "/:folderId",
  authMiddleware,
  renameFolder
);

// --------------------------------------------------
// Delete Folder
// DELETE /folders/:folderId
// --------------------------------------------------

router.delete(
  "/:folderId",
  authMiddleware,
  deleteFolder
);

module.exports = router;