const {
  S3Client,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const crypto =
  require("crypto");

// ==================================================
// AWS
// ==================================================

const AWS_REGION =
  process.env.AWS_REGION ||
  "ap-south-1";

const s3 =
  new S3Client({
    region:
      AWS_REGION,
  });

const dynamoClient =
  new DynamoDBClient({
    region:
      AWS_REGION,
  });

const dynamoDb =
  DynamoDBDocumentClient.from(
    dynamoClient
  );

// ==================================================
// CONFIG
// ==================================================

function getShareTableName() {
  const tableName =
    process.env.SHARE_TABLE_NAME ||
    "ShareTable";

  if (!tableName) {
    throw new Error(
      "SHARE_TABLE_NAME is not configured"
    );
  }

  return tableName;
}

function getPhotoTableName() {
  const tableName =
    process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error(
      "DYNAMODB_TABLE is not configured"
    );
  }

  return tableName;
}

function getBucketName() {
  const bucketName =
    process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not configured"
    );
  }

  return bucketName;
}

// ==================================================
// SHARE EXPIRY
// ==================================================

function getShareExpiry(
  days = 7
) {
  const numericDays =
    Number(days);

  /*
   * Share links can be valid for:
   *
   * minimum: 1 day
   * maximum: 30 days
   *
   * Anything invalid falls back to 7 days.
   */

  const safeDays =
    Number.isFinite(
      numericDays
    ) &&
    numericDays >= 1 &&
    numericDays <= 30
      ? numericDays
      : 7;

  const expiresAt =
    new Date(
      Date.now() +
        safeDays *
          24 *
          60 *
          60 *
          1000
    );

  return {
    expiresAt:
      expiresAt.toISOString(),

    ttl: Math.floor(
      expiresAt.getTime() /
        1000
    ),
  };
}

// ==================================================
// GET PHOTO
// ==================================================

async function getPhoto(
  photoId
) {
  const result =
    await dynamoDb.send(
      new GetCommand({
        TableName:
          getPhotoTableName(),

        Key: {
          photoId,
        },
      })
    );

  return result.Item;
}

// ==================================================
// CREATE SHARE
// ==================================================

async function createShare({
  photoId,
  userId,
  expiresInDays = 7,
}) {
  // ------------------------------------------------
  // Validate photo ID
  // ------------------------------------------------

  if (!photoId) {
    const error =
      new Error(
        "photoId is required"
      );

    error.statusCode =
      400;

    throw error;
  }

  // ------------------------------------------------
  // Get photo
  // ------------------------------------------------

  const photo =
    await getPhoto(
      photoId
    );

  if (!photo) {
    const error =
      new Error(
        "Photo not found"
      );

    error.statusCode =
      404;

    throw error;
  }

  // ------------------------------------------------
  // Ownership
  // ------------------------------------------------

  if (
    photo.userId !==
    userId
  ) {
    const error =
      new Error(
        "You are not allowed to share this photo"
      );

    error.statusCode =
      403;

    throw error;
  }

  // ------------------------------------------------
  // Trash protection
  // ------------------------------------------------

  if (
    photo.isTrashed ===
    true
  ) {
    const error =
      new Error(
        "Photos in Trash cannot be shared"
      );

    error.statusCode =
      410;

    throw error;
  }

  // ------------------------------------------------
  // Validate photo S3 key
  // ------------------------------------------------

  if (!photo.s3Key) {
    const error =
      new Error(
        "Photo storage key is missing"
      );

    error.statusCode =
      500;

    throw error;
  }

  // ------------------------------------------------
  // Generate secure random token
  // ------------------------------------------------

  const token =
    crypto
      .randomBytes(32)
      .toString("hex");

  // ------------------------------------------------
  // Expiration
  // ------------------------------------------------

  const {
    expiresAt,
    ttl,
  } =
    getShareExpiry(
      expiresInDays
    );

  const createdAt =
    new Date().toISOString();

  // ------------------------------------------------
  // Save share record
  // ------------------------------------------------

  await dynamoDb.send(
    new PutCommand({
      TableName:
        getShareTableName(),

      Item: {
        token,

        photoId,

        userId,

        createdAt,

        expiresAt,

        ttl,
      },

      ConditionExpression:
        "attribute_not_exists(token)",
    })
  );

  // ------------------------------------------------
  // Return share metadata
  // ------------------------------------------------

  return {
    token,

    photoId,

    createdAt,

    expiresAt,
  };
}

// ==================================================
// GET PUBLIC SHARED PHOTO
// ==================================================

async function getSharedPhoto(
  token
) {
  // ------------------------------------------------
  // Validate token
  // ------------------------------------------------

  if (!token) {
    const error =
      new Error(
        "Share token is required"
      );

    error.statusCode =
      400;

    throw error;
  }

  // ------------------------------------------------
  // Get share record
  // ------------------------------------------------

  const shareResult =
    await dynamoDb.send(
      new GetCommand({
        TableName:
          getShareTableName(),

        Key: {
          token,
        },
      })
    );

  const share =
    shareResult.Item;

  if (!share) {
    const error =
      new Error(
        "This share link is invalid or has expired"
      );

    error.statusCode =
      404;

    throw error;
  }

  // ------------------------------------------------
  // Check expiration manually
  //
  // DynamoDB TTL deletion is asynchronous,
  // therefore we must NOT rely only on TTL.
  // ------------------------------------------------

  const expiresAtMs =
    new Date(
      share.expiresAt
    ).getTime();

  if (
    !Number.isFinite(
      expiresAtMs
    ) ||
    expiresAtMs <=
      Date.now()
  ) {
    const error =
      new Error(
        "This share link has expired"
      );

    error.statusCode =
      410;

    throw error;
  }

  // ------------------------------------------------
  // Get original photo
  // ------------------------------------------------

  const photo =
    await getPhoto(
      share.photoId
    );

  if (!photo) {
    const error =
      new Error(
        "The shared photo no longer exists"
      );

    error.statusCode =
      404;

    throw error;
  }

  // ------------------------------------------------
  // Trash protection
  // ------------------------------------------------

  if (
    photo.isTrashed ===
    true
  ) {
    const error =
      new Error(
        "This shared photo is no longer available"
      );

    error.statusCode =
      410;

    throw error;
  }

  // ------------------------------------------------
  // Storage protection
  // ------------------------------------------------

  if (!photo.s3Key) {
    const error =
      new Error(
        "The shared photo storage key is missing"
      );

    error.statusCode =
      500;

    throw error;
  }

  // ------------------------------------------------
  // Generate temporary S3 URL
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
        "inline",
    });

  const url =
    await getSignedUrl(
      s3,
      command,
      {
        expiresIn:
          600,
      }
    );

  // ------------------------------------------------
  // Public response
  // ------------------------------------------------

  return {
    token,

    photoId:
      photo.photoId,

    name:
      photo.name ||
      photo.fileName ||
      "Shared photo",

    fileName:
      photo.fileName ||
      photo.originalFileName ||
      "photo",

    originalFileName:
      photo.originalFileName ||
      photo.fileName ||
      "photo",

    contentType:
      photo.contentType ||
      "application/octet-stream",

    fileSize:
      photo.fileSize ||
      0,

    url,

    expiresAt:
      share.expiresAt,

    createdAt:
      share.createdAt,
  };
}

// ==================================================
// REVOKE SHARE
// ==================================================

async function revokeShare({
  token,
  userId,
}) {
  // ------------------------------------------------
  // Validate token
  // ------------------------------------------------

  if (!token) {
    const error =
      new Error(
        "Share token is required"
      );

    error.statusCode =
      400;

    throw error;
  }

  // ------------------------------------------------
  // Get share
  // ------------------------------------------------

  const result =
    await dynamoDb.send(
      new GetCommand({
        TableName:
          getShareTableName(),

        Key: {
          token,
        },
      })
    );

  const share =
    result.Item;

  if (!share) {
    const error =
      new Error(
        "Share link not found"
      );

    error.statusCode =
      404;

    throw error;
  }

  // ------------------------------------------------
  // Ownership protection
  // ------------------------------------------------

  if (
    share.userId !==
    userId
  ) {
    const error =
      new Error(
        "You are not allowed to revoke this share link"
      );

    error.statusCode =
      403;

    throw error;
  }

  // ------------------------------------------------
  // Delete share record
  // ------------------------------------------------

  await dynamoDb.send(
    new DeleteCommand({
      TableName:
        getShareTableName(),

      Key: {
        token,
      },
    })
  );

  return {
    success: true,

    message:
      "Share link revoked",
  };
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  createShare,
  getSharedPhoto,
  revokeShare,
};