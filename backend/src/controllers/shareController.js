const {
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const crypto = require("crypto");

// ==================================================
// AWS
// ==================================================

const AWS_REGION =
  process.env.AWS_REGION ||
  "ap-south-1";

const s3 =
  new S3Client({
    region: AWS_REGION,
  });

const dynamoClient =
  new DynamoDBClient({
    region: AWS_REGION,
  });

const dynamoDb =
  DynamoDBDocumentClient.from(
    dynamoClient,
  );

// ==================================================
// Helpers
// ==================================================

const getPhotoTableName = () => {
  const tableName =
    process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error(
      "DYNAMODB_TABLE is not configured",
    );
  }

  return tableName;
};

const getShareTableName = () => {
  const tableName =
    process.env.SHARE_TABLE_NAME ||
    "ShareTable";

  if (!tableName) {
    throw new Error(
      "SHARE_TABLE_NAME is not configured",
    );
  }

  return tableName;
};

const getBucketName = () => {
  const bucketName =
    process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not configured",
    );
  }

  return bucketName;
};

const sanitizeFileName = (
  fileName,
) => {
  return String(
    fileName ||
      "photo",
  )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    );
};

const getShareBaseUrl = () => {
  const configuredUrl =
    process.env.PUBLIC_APP_URL;

  if (
    configuredUrl &&
    typeof configuredUrl ===
      "string"
  ) {
    return configuredUrl.replace(
      /\/+$/,
      "",
    );
  }

  return "";
};

// ==================================================
// Create Share Link
// POST /photos/:photoId/share
// Protected
// ==================================================

const createShare = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    // ------------------------------------------------
    // Get photo
    // ------------------------------------------------

    const photoResult =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getPhotoTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      photoResult.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    // ------------------------------------------------
    // Ownership
    // ------------------------------------------------

    if (
      photo.userId !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to share this photo",
      });
    }

    // ------------------------------------------------
    // Trash check
    // ------------------------------------------------

    if (
      photo.isTrashed === true
    ) {
      return res.status(410).json({
        success: false,
        message:
          "Photos in Trash cannot be shared",
      });
    }

    // ------------------------------------------------
    // Generate secure token
    // ------------------------------------------------

    const token =
      crypto
        .randomBytes(32)
        .toString("hex");

    const shareId =
      crypto.randomUUID();

    const now =
      new Date().toISOString();

    // ------------------------------------------------
    // Optional expiry
    //
    // Default: 7 days
    // ------------------------------------------------

    const configuredExpiryDays =
      Number(
        process.env.SHARE_EXPIRY_DAYS ||
          7,
      );

    const expiryDays =
      Number.isFinite(
        configuredExpiryDays,
      ) &&
      configuredExpiryDays > 0
        ? configuredExpiryDays
        : 7;

    const expiresAt =
      new Date(
        Date.now() +
          expiryDays *
            24 *
            60 *
            60 *
            1000,
      ).toISOString();

    const item = {
      shareId,

      photoId,

      userId,

      token,

      createdAt: now,

      expiresAt,

      revoked: false,
    };

    // ------------------------------------------------
    // Save Share
    // ------------------------------------------------

    await dynamoDb.send(
      new PutCommand({
        TableName:
          getShareTableName(),

        Item: item,
      }),
    );

    // ------------------------------------------------
    // Build public URL
    // ------------------------------------------------

    const baseUrl =
      getShareBaseUrl();

    const shareUrl = baseUrl
      ? `${baseUrl}/shared/${token}`
      : `/shared/${token}`;

    return res.status(201).json({
      success: true,

      message:
        "Share link created",

      share: {
        shareId,

        photoId,

        token,

        shareUrl,

        createdAt: now,

        expiresAt,

        revoked: false,
      },
    });
  } catch (error) {
    console.error(
      "Create share error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// Get Shared Photo
// GET /shared/:token
// Public
// ==================================================

const getSharedPhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      token,
    } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message:
          "Share token is required",
      });
    }

    // ------------------------------------------------
    // Find share by token
    //
    // Requires token-index on ShareTable.
    // ------------------------------------------------

    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            getShareTableName(),

          IndexName:
            "token-index",

          KeyConditionExpression:
            "#token = :token",

          ExpressionAttributeNames: {
            "#token":
              "token",
          },

          ExpressionAttributeValues: {
            ":token":
              token,
          },

          Limit: 1,
        }),
      );

    const share =
      result.Items?.[0];

    if (!share) {
      return res.status(404).json({
        success: false,
        message:
          "Share link not found or expired",
      });
    }

    // ------------------------------------------------
    // Revoked
    // ------------------------------------------------

    if (
      share.revoked === true
    ) {
      return res.status(410).json({
        success: false,
        message:
          "This share link has been revoked",
      });
    }

    // ------------------------------------------------
    // Expiry
    // ------------------------------------------------

    if (
      share.expiresAt &&
      new Date(
        share.expiresAt,
      ).getTime() <=
        Date.now()
    ) {
      return res.status(410).json({
        success: false,
        message:
          "This share link has expired",
      });
    }

    // ------------------------------------------------
    // Get photo
    // ------------------------------------------------

    const photoResult =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getPhotoTableName(),

          Key: {
            photoId:
              share.photoId,
          },
        }),
      );

    const photo =
      photoResult.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo no longer exists",
      });
    }

    // ------------------------------------------------
    // If photo is in Trash
    // ------------------------------------------------

    if (
      photo.isTrashed === true
    ) {
      return res.status(410).json({
        success: false,
        message:
          "This photo is currently in Trash",
      });
    }

    // ------------------------------------------------
    // Validate S3 key
    // ------------------------------------------------

    if (
      !photo.s3Key ||
      typeof photo.s3Key !==
        "string"
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Photo file is not available",
      });
    }

    // ------------------------------------------------
    // Generate temporary S3 URL
    //
    // This keeps the S3 bucket private.
    //
    // IMPORTANT:
    // Use the actual S3 client here.
    // ------------------------------------------------

    const command =
      new GetObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          photo.s3Key,

        ResponseContentType:
          photo.contentType ||
          "application/octet-stream",

        ResponseContentDisposition:
          `inline; filename="${sanitizeFileName(
            photo.originalFileName ||
              photo.fileName ||
              photo.name ||
              "photo",
          )}"`,
      });

    const signedUrl =
      await getSignedUrl(
        s3,
        command,
        {
          expiresIn: 300,
        },
      );

    return res.status(200).json({
      success: true,

      photo: {
        photoId:
          photo.photoId,

        name:
          photo.name ||
          photo.fileName ||
          photo.originalFileName ||
          "Untitled photo",

        originalFileName:
          photo.originalFileName ||
          photo.fileName ||
          "",

        fileName:
          photo.fileName ||
          photo.originalFileName ||
          "",

        contentType:
          photo.contentType ||
          "",

        fileSize:
          photo.fileSize ||
          0,

        createdAt:
          photo.createdAt ||
          "",

        updatedAt:
          photo.updatedAt ||
          photo.createdAt ||
          "",

        url:
          signedUrl,

        downloadUrl:
          signedUrl,
      },

      share: {
        shareId:
          share.shareId,

        photoId:
          share.photoId,

        createdAt:
          share.createdAt,

        expiresAt:
          share.expiresAt,

        revoked:
          share.revoked === true,
      },
    });
  } catch (error) {
    console.error(
      "Get shared photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// Revoke Share
// DELETE /photos/:photoId/share/:shareId
// Protected
// ==================================================

const revokeShare = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
      shareId,
    } = req.params;

    const userId =
      req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    if (
      !photoId ||
      !shareId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "photoId and shareId are required",
      });
    }

    // ------------------------------------------------
    // Find share
    // ------------------------------------------------

    const shareResult =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getShareTableName(),

          Key: {
            shareId,
          },
        }),
      );

    const share =
      shareResult.Item;

    if (!share) {
      return res.status(404).json({
        success: false,
        message:
          "Share link not found",
      });
    }

    // ------------------------------------------------
    // Ownership checks
    // ------------------------------------------------

    if (
      share.userId !==
      userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to revoke this share",
      });
    }

    if (
      share.photoId !==
      photoId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Share link does not belong to this photo",
      });
    }

    // ------------------------------------------------
    // Already revoked
    // ------------------------------------------------

    if (
      share.revoked === true
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Share link is already revoked",
      });
    }

    // ------------------------------------------------
    // Revoke
    // ------------------------------------------------

    await dynamoDb.send(
      new UpdateCommand({
        TableName:
          getShareTableName(),

        Key: {
          shareId,
        },

        UpdateExpression:
          "SET revoked = :revoked",

        ExpressionAttributeValues: {
          ":revoked":
            true,
        },
      }),
    );

    return res.status(200).json({
      success: true,

      message:
        "Share link revoked",
    });
  } catch (error) {
    console.error(
      "Revoke share error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// Exports
// ==================================================

module.exports = {
  createShare,
  getSharedPhoto,
  revokeShare,
};