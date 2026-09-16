const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  PutCommand,
} = require("@aws-sdk/lib-dynamodb");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const crypto = require("crypto");
const path = require("path");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
});

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const dynamo = DynamoDBDocumentClient.from(dynamoClient);

const getBucketName = () => {
  const bucketName = process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("S3_BUCKET_NAME is not configured");
  }

  return bucketName;
};

const getTableName = () => {
  const tableName = process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error("DYNAMODB_TABLE is not configured");
  }

  return tableName;
};

const sanitizeFileName = (fileName) => {
  const originalName = path.basename(fileName);

  return originalName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");
};

// --------------------------------------------------
// Generate S3 Upload URL
// --------------------------------------------------

const uploadUrl = async (req, res, next) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message: "fileName and contentType are required",
      });
    }

    if (!contentType.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    const userId = req.user.userId;

    const photoId = crypto.randomUUID();

    const safeFileName = sanitizeFileName(fileName);

    const key = `photos/${userId}/${photoId}-${safeFileName}`;

    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    return res.status(200).json({
      success: true,
      uploadUrl: signedUrl,
      key,
      photoId,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Confirm S3 Upload + Save DynamoDB Metadata
// --------------------------------------------------

const confirmUpload = async (req, res, next) => {
  try {
    const {
      photoId,
      key,
      fileName,
      contentType,
      fileSize,
    } = req.body;

    if (!photoId || !key || !fileName || !contentType) {
      return res.status(400).json({
        success: false,
        message:
          "photoId, key, fileName and contentType are required",
      });
    }

    const userId = req.user.userId;

    // Security check
    const expectedPrefix = `photos/${userId}/`;

    if (!key.startsWith(expectedPrefix)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to save this photo",
      });
    }

    // Verify that the object actually exists in S3
    const headCommand = new HeadObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const s3Object = await s3.send(headCommand);

    // Save metadata in DynamoDB
    const item = {
      photoId,
      userId,
      s3Key: key,
      fileName,
      contentType,
      fileSize: fileSize || s3Object.ContentLength || 0,
      createdAt: new Date().toISOString(),
    };

    await dynamo.send(
      new PutCommand({
        TableName: getTableName(),
        Item: item,
      })
    );

    return res.status(201).json({
      success: true,
      message: "Photo metadata saved",
      photo: item,
    });
  } catch (error) {
    console.error("Confirm upload error:", error);

    next(error);
  }
};

// --------------------------------------------------
// Generate S3 Download URL
// --------------------------------------------------

const downloadUrl = async (req, res, next) => {
  try {
    const { key } = req.query;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "key is required",
      });
    }

    const userId = req.user.userId;

    const expectedPrefix = `photos/${userId}/`;

    if (!key.startsWith(expectedPrefix)) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this photo",
      });
    }

    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    return res.status(200).json({
      success: true,
      downloadUrl: signedUrl,
      key,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadUrl,
  confirmUpload,
  downloadUrl,
};