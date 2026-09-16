const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
  uploadUrl,
  confirmUpload,
  downloadUrl,
} = require("../controllers/photoController");

const router = express.Router();

router.post(
  "/upload-url",
  authMiddleware,
  uploadUrl
);

router.post(
  "/confirm",
  authMiddleware,
  confirmUpload
);

router.get(
  "/download-url",
  authMiddleware,
  downloadUrl
);

module.exports = router;