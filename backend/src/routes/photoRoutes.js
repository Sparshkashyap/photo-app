const express = require("express");

const router = express.Router();

const {
  authenticateToken,
} = require("../middleware/authMiddleware");

const {
  uploadPhoto,
  downloadPhoto,
} = require("../controllers/photoController");

router.post(
  "/photos/upload-url",
  authenticateToken,
  uploadPhoto
);

router.get(
  "/photos/download-url",
  authenticateToken,
  downloadPhoto
);

module.exports = router;