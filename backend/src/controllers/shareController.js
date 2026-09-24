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

const REGION =
  process.env.AWS_REGION ||
  "ap-south-1";

const s3 =
  new S3Client({
    region: REGION,
  });

const dynamoDb =
  DynamoDBDocumentClient.from(
    new DynamoDBClient({
      region: REGION,
    }),
  );

// ==================================================
// HELPERS
// ==================================================

function getPhotoTableName() {
  const tableName =
    process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error(
      "DYNAMODB_TABLE is not configured",
    );
  }

  return tableName;
}

function getShareTableName() {
  return (
    process.env.SHARE_TABLE_NAME ||
    "ShareTable"
  );
}

function getBucketName() {
  const bucketName =
    process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not configured",
    );
  }

  return bucketName;
}

function sanitizeFileName(fileName) {
  return String(
    fileName || "photo",
  )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    );
}

// ==================================================
// GET PHOTO
// ==================================================

async function getPhoto(
  photoId,
) {
  const result =
    await dynamoDb.send(
      new GetCommand({
        TableName:
          getPhotoTableName(),

        Key: {
          photoId,
        },
      }),
    );

  return result.Item;
}

// ==================================================
// FIND SHARE BY TOKEN
// ==================================================

async function findShareByToken(
  token,
) {
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

  return result.Items?.[0];
}

// ==================================================
// CREATE AWS S3 PRESIGNED URL
// ==================================================

async function createSignedPhotoUrl(
  photo,
  disposition = "inline",
) {
  const fileName =
    sanitizeFileName(
      photo.originalFileName ||
        photo.fileName ||
        photo.name ||
        "photo",
    );

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
        `${disposition}; filename="${fileName}"`,
    });

  return getSignedUrl(
    s3,
    command,
    {
      // Same as your old working URL
      expiresIn: 300,
    },
  );
}

// ==================================================
// CREATE SHARE
//
// POST /share/:photoId
// Protected
// ==================================================

async function createShare(
  req,
  res,
  next,
) {
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

    const photo =
      await getPhoto(
        photoId,
      );

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
    // Trash
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
    // S3 key
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
    // Generate share token
    // ------------------------------------------------

    const token =
      crypto
        .randomBytes(32)
        .toString("hex");

    const shareId =
      crypto.randomUUID();

    const createdAt =
      new Date().toISOString();

    // ------------------------------------------------
    // Share expiry
    //
    // Default = 7 days
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

    // ------------------------------------------------
    // Save share record
    // ------------------------------------------------

    await dynamoDb.send(
      new PutCommand({
        TableName:
          getShareTableName(),

        Item: {
          shareId,

          photoId,

          userId,

          token,

          createdAt,

          expiresAt,

          ttl: Math.floor(
            new Date(
              expiresAt,
            ).getTime() /
              1000,
          ),

          revoked: false,
        },
      }),
    );

    // ------------------------------------------------
    // IMPORTANT
    //
    // Generate DIRECT AWS S3 URL.
    //
    // This is what frontend will receive as
    // shareUrl.
    // ------------------------------------------------

    const signedUrl =
      await createSignedPhotoUrl(
        photo,
        "inline",
      );

    return res.status(201).json({
      success: true,

      message:
        "Share link created",

      share: {
        shareId,

        photoId,

        token,

        // DIRECT AWS S3 URL
        shareUrl:
          signedUrl,

        // Explicit field also available
        awsUrl:
          signedUrl,

        createdAt,

        expiresAt,

        revoked: false,

        // Tell frontend that this URL
        // is temporary.
        urlExpiresIn:
          300,
      },
    });
  } catch (error) {
    console.error(
      "Create share error:",
      error,
    );

    next(error);
  }
}

// ==================================================
// GET SHARED PHOTO
//
// GET /share/:token
//
// This remains available for future use.
// It returns a fresh AWS S3 URL.
//
// ==================================================

async function getSharedPhoto(
  req,
  res,
  next,
) {
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
    // Find share
    // ------------------------------------------------

    const share =
      await findShareByToken(
        token,
      );

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
    // Expired
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

    const photo =
      await getPhoto(
        share.photoId,
      );

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo no longer exists",
      });
    }

    // ------------------------------------------------
    // Trash
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
    // S3 key
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
    // Fresh AWS URL
    // ------------------------------------------------

    const signedUrl =
      await createSignedPhotoUrl(
        photo,
        "inline",
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

        // DIRECT AWS URL
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

        token:
          share.token,

        createdAt:
          share.createdAt,

        expiresAt:
          share.expiresAt,

        revoked:
          share.revoked ===
          true,
      },
    });
  } catch (error) {
    console.error(
      "Get shared photo error:",
      error,
    );

    next(error);
  }
}

// ==================================================
// REVOKE SHARE
//
// DELETE /share/:photoId/:shareId
//
// ==================================================

async function revokeShare(
  req,
  res,
  next,
) {
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

    const result =
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
      result.Item;

    if (!share) {
      return res.status(404).json({
        success: false,
        message:
          "Share link not found",
      });
    }

    // ------------------------------------------------
    // Ownership
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

    // ------------------------------------------------
    // Photo check
    // ------------------------------------------------

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
          ":revoked": true,
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
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  createShare,
  getSharedPhoto,
  revokeShare,
};