const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
} = require("../controllers/folderController");

const router =
  express.Router();

// Create folder
router.post(
  "/",
  authMiddleware,
  createFolder
);

// Get current user's folders
router.get(
  "/",
  authMiddleware,
  getFolders
);

// Rename folder
router.patch(
  "/:folderId",
  authMiddleware,
  renameFolder
);

// Delete folder
router.delete(
  "/:folderId",
  authMiddleware,
  deleteFolder
);

module.exports = router;