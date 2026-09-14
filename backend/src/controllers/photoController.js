const crypto = require("crypto");

const {
  createUploadUrl,
  createDownloadUrl,
} = require("../services/s3Service");

const {
  sanitizeFileName,
  allowedImageTypes,
} = require("../utils/validation");

const uploadPhoto = async (req, res, next) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "fileName and contentType are required",
      });
    }

    if (!allowedImageTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported image type",
      });
    }

    const safeFileName = sanitizeFileName(fileName);

    const photoId = crypto.randomUUID();

    const key = `photos/${req.user.userId}/${photoId}-${safeFileName}`;

    const uploadUrl = await createUploadUrl({
      key,
      contentType,
    });

    return res.status(200).json({
      success: true,
      uploadUrl,
      key,
    });
  } catch (error) {
    next(error);
  }
};

const downloadPhoto = async (req, res, next) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Photo key is required",
      });
    }

    const userPrefix = `photos/${req.user.userId}/`;

    if (!key.startsWith(userPrefix)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this photo",
      });
    }

    const downloadUrl = await createDownloadUrl(key);

    return res.status(200).json({
      success: true,
      downloadUrl,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPhoto,
  downloadPhoto,
};