// backend/src/controllers/photoController.js

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
  QueryCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const {
  generateImageCaption,
} = require("../services/aiService");

const crypto = require("crypto");
const path = require("path");

// ==================================================
// CONSTANTS
// ==================================================

const MAX_UPLOAD_SIZE_BYTES =
  100 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES =
  new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",

    "video/mp4",

    "audio/mpeg",
    "audio/mp3",
  ]);

const PHOTO_USER_INDEX_NAME =
  "userId-index";

const AWS_REGION =
  process.env.AWS_REGION ||
  "ap-south-1";

// ==================================================
// AWS CLIENTS
// ==================================================

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
// ENVIRONMENT HELPERS
// ==================================================

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

const getTableName = () => {
  const tableName =
    process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error(
      "DYNAMODB_TABLE is not configured",
    );
  }

  return tableName;
};

const getFolderTableName = () => {
  const tableName =
    process.env.FOLDER_TABLE ||
    "FolderTable";

  if (!tableName) {
    throw new Error(
      "FOLDER_TABLE is not configured",
    );
  }

  return tableName;
};

// ==================================================
// HELPERS
// ==================================================

const sanitizeFileName = (
  fileName,
) => {
  const originalName =
    path.basename(
      String(
        fileName || "file",
      ),
    );

  return originalName
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-",
    )
    .replace(
      /-+/g,
      "-",
    );
};

const normalizeContentType = (
  contentType,
) => {
  return String(
    contentType || "",
  )
    .trim()
    .toLowerCase();
};

const isAllowedContentType = (
  contentType,
) => {
  return ALLOWED_CONTENT_TYPES.has(
    normalizeContentType(
      contentType,
    ),
  );
};

const getMediaType = (
  contentType,
) => {
  const normalized =
    normalizeContentType(
      contentType,
    );

  if (
    normalized.startsWith(
      "image/",
    )
  ) {
    return "image";
  }

  if (
    normalized.startsWith(
      "video/",
    )
  ) {
    return "video";
  }

  if (
    normalized.startsWith(
      "audio/",
    )
  ) {
    return "audio";
  }

  return "unknown";
};

const isValidFolderId = (
  folderId,
) => {
  return (
    folderId !== undefined &&
    folderId !== null &&
    folderId !== ""
  );
};

const getUserId = (req) => {
  if (!req.user?.userId) {
    throw new Error(
      "Authenticated userId is missing",
    );
  }

  return req.user.userId;
};

// ==================================================
// GENERATE S3 UPLOAD URL
// POST /photos/upload-url
// ==================================================

const uploadUrl = async (
  req,
  res,
  next,
) => {
  try {
    const {
      fileName,
      contentType,
    } = req.body || {};

    if (
      !fileName ||
      !contentType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "fileName and contentType are required",
      });
    }

    const normalizedContentType =
      normalizeContentType(
        contentType,
      );

    if (
      !isAllowedContentType(
        normalizedContentType,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported file type. Allowed files are JPG, JPEG, PNG, WEBP, MP4 and MP3",
      });
    }

    const userId =
      getUserId(req);

    const photoId =
      crypto.randomUUID();

    const safeFileName =
      sanitizeFileName(
        fileName,
      );

    const key =
      `photos/${userId}/${photoId}-${safeFileName}`;

    const command =
      new PutObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          key,

        ContentType:
          normalizedContentType,
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

      uploadUrl:
        signedUrl,

      key,

      photoId,

      fileName,

      contentType:
        normalizedContentType,

      mediaType:
        getMediaType(
          normalizedContentType,
        ),

      expiresIn: 300,
    });
  } catch (error) {
    console.error(
      "Generate upload URL error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// CONFIRM S3 UPLOAD
// POST /photos/confirm
// ==================================================

const confirmUpload = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
      key,
      fileName,
      contentType,
      name,
      folderId,
    } = req.body || {};

    if (
      !photoId ||
      !key ||
      !fileName ||
      !contentType ||
      !name
    ) {
      return res.status(400).json({
        success: false,
        message:
          "photoId, key, fileName, contentType and name are required",
      });
    }

    const normalizedContentType =
      normalizeContentType(
        contentType,
      );

    if (
      !isAllowedContentType(
        normalizedContentType,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported file type. Allowed files are JPG, JPEG, PNG, WEBP, MP4 and MP3",
      });
    }

    const userId =
      getUserId(req);

    const trimmedName =
      String(name).trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message:
          "Photo name cannot be empty",
      });
    }

    if (
      trimmedName.length > 120
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo name cannot exceed 120 characters",
      });
    }

    // ==================================================
    // SECURITY: USER KEY
    // ==================================================

    const expectedPrefix =
      `photos/${userId}/`;

    if (
      typeof key !== "string" ||
      !key.startsWith(
        expectedPrefix,
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to save this file",
      });
    }

    // ==================================================
    // VERIFY S3 OBJECT
    // ==================================================

    const headCommand =
      new HeadObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          key,
      });

    const s3Object =
      await s3.send(
        headCommand,
      );

    const actualContentType =
      normalizeContentType(
        s3Object.ContentType ||
          normalizedContentType,
      );

    const actualFileSize =
      Number(
        s3Object.ContentLength || 0,
      );

    if (
      !isAllowedContentType(
        actualContentType,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Uploaded file type is not supported",
      });
    }

    if (
      actualFileSize <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Uploaded file is empty or invalid",
      });
    }

    if (
      actualFileSize >
      MAX_UPLOAD_SIZE_BYTES
    ) {
      return res.status(400).json({
        success: false,
        message:
          "File size cannot exceed 100 MB",
      });
    }

    // ==================================================
    // VERIFY FOLDER OWNERSHIP
    // ==================================================

    let normalizedFolderId =
      null;

    if (
      isValidFolderId(
        folderId,
      )
    ) {
      normalizedFolderId =
        String(
          folderId,
        ).trim();

      const folderResult =
        await dynamoDb.send(
          new GetCommand({
            TableName:
              getFolderTableName(),

            Key: {
              folderId:
                normalizedFolderId,
            },
          }),
        );

      const folder =
        folderResult.Item;

      if (!folder) {
        return res.status(404).json({
          success: false,
          message:
            "Folder not found",
        });
      }

      if (
        folder.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to use this folder",
        });
      }
    }

    // ==================================================
    // MEDIA TYPE
    // ==================================================

    const mediaType =
      getMediaType(
        actualContentType,
      );

    // ==================================================
    // AI CAPTION STATUS
    // ==================================================

    // Caption generation is intentionally asynchronous.
    // The S3 ObjectCreated event will trigger the background
    // caption worker after the file is uploaded.
    const captionStatus =
      mediaType === "image"
        ? "pending"
        : "not_applicable";

    // ==================================================
    // SAVE DYNAMODB METADATA
    // ==================================================

    const now =
      new Date().toISOString();

    const item = {
      photoId,

      userId,

      name:
        trimmedName,

      originalFileName:
        String(fileName),

      fileName:
        String(fileName),

      s3Key:
        key,

      contentType:
        actualContentType,

      mediaType,

      captionStatus,

      fileSize:
        actualFileSize,

      isTrashed:
        false,

      isFavorite:
        false,

      createdAt:
        now,

      updatedAt:
        now,
    };

    if (
      normalizedFolderId
    ) {
      item.folderId =
        normalizedFolderId;
    }

    await dynamoDb.send(
      new PutCommand({
        TableName:
          getTableName(),

        Item:
          item,
      }),
    );

    return res.status(201).json({
      success: true,

      message:
        "Photo metadata saved",

      photo:
        item,
    });
  } catch (error) {
    console.error(
      "Confirm upload error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// BACKGROUND AI CAPTION WORKER
// Triggered by the S3 ObjectCreated event.
// ==================================================

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms),
  );

const getPhotoFromS3Key = async (key) => {
  if (
    typeof key !== "string" ||
    !key.startsWith("photos/")
  ) {
    return null;
  }

  const remainder = key.slice("photos/".length);
  const separatorIndex = remainder.indexOf("/");

  if (separatorIndex <= 0) {
    return null;
  }

  const userId = remainder.slice(0, separatorIndex);
  const filePart = remainder.slice(separatorIndex + 1);
  const photoId = filePart.slice(0, 36);

  if (!userId || !photoId) {
    return null;
  }

  return {
    userId,
    photoId,
  };
};

const processCaptionJob = async ({
  photoId,
  userId,
}) => {
  const MAX_DB_WAIT_ATTEMPTS = 6;

  let photo = null;

  // S3 can invoke this Lambda before /photos/confirm finishes.
  // Wait briefly for the DynamoDB metadata to appear.
  for (
    let attempt = 1;
    attempt <= MAX_DB_WAIT_ATTEMPTS;
    attempt += 1
  ) {
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { photoId },
      }),
    );

    photo = result.Item || null;

    if (photo) {
      break;
    }

    if (attempt < MAX_DB_WAIT_ATTEMPTS) {
      await sleep(Math.min(attempt * 1000, 5000));
    }
  }

  if (!photo) {
    console.warn(
      "Caption worker: photo metadata was not found",
      { photoId, userId },
    );

    return {
      success: false,
      skipped: true,
      reason: "photo_not_found",
    };
  }

  if (photo.userId !== userId) {
    console.error(
      "Caption worker: user mismatch",
      { photoId },
    );

    return {
      success: false,
      skipped: true,
      reason: "user_mismatch",
    };
  }

  const mediaType =
    photo.mediaType ||
    getMediaType(photo.contentType);

  if (mediaType !== "image") {
    return {
      success: true,
      skipped: true,
      reason: "not_an_image",
    };
  }

  if (photo.isTrashed === true) {
    return {
      success: true,
      skipped: true,
      reason: "photo_in_trash",
    };
  }

  if (photo.captionStatus === "ready") {
    return {
      success: true,
      skipped: true,
      reason: "already_generated",
    };
  }

  const updatedAt = new Date().toISOString();

  await dynamoDb.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: { photoId },
      UpdateExpression:
        "SET captionStatus = :status, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":status": "processing",
        ":updatedAt": updatedAt,
      },
    }),
  );

  try {
    const objectResult = await s3.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: photo.s3Key,
      }),
    );

    if (!objectResult.Body) {
      throw new Error(
        "Photo file could not be loaded from S3",
      );
    }

    const imageBuffer = Buffer.from(
      await objectResult.Body.transformToByteArray(),
    );

    const aiResult = await generateImageCaption({
      imageBuffer,
      fileName:
        photo.fileName ||
        photo.originalFileName ||
        "image.jpg",
      contentType:
        photo.contentType || "image/jpeg",
    });

    const caption =
      typeof aiResult?.caption === "string"
        ? aiResult.caption.trim()
        : "";

    if (!aiResult?.success || !caption) {
      throw new Error(
        "AI service returned an empty caption",
      );
    }

    const completedAt =
      new Date().toISOString();

    await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { photoId },
        UpdateExpression:
          "SET caption = :caption, captionStatus = :status, updatedAt = :updatedAt REMOVE captionError",
        ExpressionAttributeValues: {
          ":caption": caption,
          ":status": "ready",
          ":updatedAt": completedAt,
        },
      }),
    );

    console.log(
      "Caption generated successfully",
      { photoId },
    );

    return {
      success: true,
      caption,
    };
  } catch (error) {
    console.error(
      "Background AI caption generation failed:",
      error,
    );

    const failedAt =
      new Date().toISOString();

    await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { photoId },
        UpdateExpression:
          "SET captionStatus = :status, captionError = :captionError, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":status": "failed",
          ":captionError":
            error instanceof Error
              ? error.message.slice(0, 500)
              : "AI caption generation failed",
          ":updatedAt": failedAt,
        },
      }),
    );

    return {
      success: false,
      caption: null,
    };
  }
};

const processCaptionJobFromS3Event = async (
  event,
) => {
  const records = Array.isArray(event?.Records)
    ? event.Records
    : [];

  for (const record of records) {
    if (
      record?.eventSource !== "aws:s3" &&
      record?.EventSource !== "aws:s3"
    ) {
      continue;
    }

    const rawKey =
      record?.s3?.object?.key;

    if (!rawKey) {
      continue;
    }

    const key = decodeURIComponent(
      String(rawKey).replace(/\+/g, " "),
    );

    const parsed =
      await getPhotoFromS3Key(key);

    if (!parsed) {
      continue;
    }

    await processCaptionJob(parsed);
  }

  return {
    success: true,
  };
};

// ==================================================
// GENERATE AI CAPTION FOR EXISTING PHOTO
// POST /photos/:photoId/caption
// ==================================================

const generateCaptionForPhoto = async (
  req,
  res,
  next,
) => {
  try {
    const { photoId } = req.params;
    const userId = getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message: "photoId is required",
      });
    }

    const result = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { photoId },
      }),
    );

    const photo = result.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    if (photo.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to access this photo",
      });
    }

    if (photo.isTrashed === true) {
      return res.status(400).json({
        success: false,
        message: "Restore the photo before generating a caption",
      });
    }

    const mediaType =
      photo.mediaType || getMediaType(photo.contentType);

    if (mediaType !== "image") {
      return res.status(400).json({
        success: false,
        message: "AI captions are available only for images",
      });
    }

    const objectResult = await s3.send(
      new GetObjectCommand({
        Bucket: getBucketName(),
        Key: photo.s3Key,
      }),
    );

    if (!objectResult.Body) {
      return res.status(404).json({
        success: false,
        message: "Photo file could not be loaded",
      });
    }

    const imageBuffer = Buffer.from(
      await objectResult.Body.transformToByteArray(),
    );

    const aiResult = await generateImageCaption({
      imageBuffer,
      fileName: photo.fileName || photo.originalFileName || "image.jpg",
      contentType: photo.contentType || "image/jpeg",
    });

    const caption =
      typeof aiResult?.caption === "string"
        ? aiResult.caption.trim()
        : "";

    if (!aiResult?.success || !caption) {
      return res.status(502).json({
        success: false,
        message: "AI caption could not be generated",
      });
    }

    const updatedAt = new Date().toISOString();

    await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),
        Key: { photoId },
        UpdateExpression:
          "SET caption = :caption, captionStatus = :status, updatedAt = :updatedAt REMOVE captionError",
        ExpressionAttributeValues: {
          ":caption": caption,
          ":status": "ready",
          ":updatedAt": updatedAt,
        },
      }),
    );

    return res.status(200).json({
      success: true,
      message: "AI caption generated",
      caption,
    });
  } catch (error) {
    console.error(
      "Generate AI caption error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// GET CURRENT USER PHOTOS
// GET /photos
// ==================================================

const getPhotos = async (
  req,
  res,
  next,
) => {
  try {
    const userId =
      getUserId(req);

    const search =
      typeof req.query.search ===
      "string"
        ? req.query.search
            .trim()
            .toLowerCase()
        : "";

    const sort =
      typeof req.query.sort ===
      "string"
        ? req.query.sort
        : "newest";

    const type =
      typeof req.query.type ===
      "string"
        ? req.query.type
        : "all";

    const folderId =
      typeof req.query.folderId ===
      "string"
        ? req.query.folderId.trim()
        : null;

    const validSorts = [
      "newest",
      "oldest",
      "name_asc",
      "name_desc",
    ];

    const validTypes = [
      "all",
      "image",
      "video",
      "audio",
    ];

    if (
      !validSorts.includes(sort)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid sort option",
      });
    }

    if (
      !validTypes.includes(type)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid type filter",
      });
    }

    // ==================================================
    // VERIFY FOLDER
    // ==================================================

    if (
      folderId &&
      folderId !== "root"
    ) {
      const folderResult =
        await dynamoDb.send(
          new GetCommand({
            TableName:
              getFolderTableName(),

            Key: {
              folderId,
            },
          }),
        );

      const folder =
        folderResult.Item;

      if (!folder) {
        return res.status(404).json({
          success: false,
          message:
            "Folder not found",
        });
      }

      if (
        folder.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to access this folder",
        });
      }
    }

    // ==================================================
    // QUERY PHOTOS
    // ==================================================

    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            getTableName(),

          IndexName:
            PHOTO_USER_INDEX_NAME,

          KeyConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },
        }),
      );

    let photos =
      result.Items || [];

    // ==================================================
    // ACTIVE PHOTOS ONLY
    // ==================================================

    photos =
      photos.filter(
        (photo) =>
          photo.isTrashed !== true,
      );

    // ==================================================
    // FOLDER FILTER
    // ==================================================

    if (folderId) {
      if (
        folderId === "root"
      ) {
        photos =
          photos.filter(
            (photo) =>
              !photo.folderId,
          );
      } else {
        photos =
          photos.filter(
            (photo) =>
              photo.folderId ===
              folderId,
          );
      }
    }

    // ==================================================
    // SEARCH
    // ==================================================

    if (search) {
      photos =
        photos.filter(
          (photo) => {
            const name =
              String(
                photo.name || "",
              ).toLowerCase();

            const originalFileName =
              String(
                photo.originalFileName ||
                  "",
              ).toLowerCase();

            const fileName =
              String(
                photo.fileName || "",
              ).toLowerCase();

            return (
              name.includes(search) ||
              originalFileName.includes(
                search,
              ) ||
              fileName.includes(search)
            );
          },
        );
    }

    // ==================================================
    // TYPE FILTER
    // ==================================================

    if (type !== "all") {
      photos =
        photos.filter(
          (photo) => {
            const mediaType =
              photo.mediaType ||
              getMediaType(
                photo.contentType,
              );

            return (
              mediaType === type
            );
          },
        );
    }

    // ==================================================
    // SORT
    // ==================================================

    photos.sort(
      (a, b) => {
        if (
          sort === "name_asc"
        ) {
          return String(
            a.name || "",
          ).localeCompare(
            String(
              b.name || "",
            ),
          );
        }

        if (
          sort === "name_desc"
        ) {
          return String(
            b.name || "",
          ).localeCompare(
            String(
              a.name || "",
            ),
          );
        }

        const aTime =
          new Date(
            a.createdAt || 0,
          ).getTime();

        const bTime =
          new Date(
            b.createdAt || 0,
          ).getTime();

        if (
          sort === "oldest"
        ) {
          return (
            aTime - bTime
          );
        }

        return (
          bTime - aTime
        );
      },
    );

    // ==================================================
    // SIGNED URLS
    // ==================================================

    const photosWithUrls =
      await Promise.all(
        photos.map(
          async (photo) => {
            const command =
              new GetObjectCommand({
                Bucket:
                  getBucketName(),

                Key:
                  photo.s3Key,
              });

            const downloadUrl =
              await getSignedUrl(
                s3,
                command,
                {
                  expiresIn:
                    3600,
                },
              );

            return {
              ...photo,

              id:
                photo.photoId,

              mediaType:
                photo.mediaType ||
                getMediaType(
                  photo.contentType,
                ),

              downloadUrl,

              url:
                downloadUrl,
            };
          },
        ),
      );

    return res.status(200).json({
      success: true,

      count:
        photosWithUrls.length,

      photos:
        photosWithUrls,
    });
  } catch (error) {
    console.error(
      "Get photos error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// GET SINGLE PHOTO
// GET /photos/:photoId
// ==================================================

const getPhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const result =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      result.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Photo is in trash",
      });
    }

    const command =
      new GetObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          photo.s3Key,
      });

    const downloadUrl =
      await getSignedUrl(
        s3,
        command,
        {
          expiresIn: 3600,
        },
      );

    return res.status(200).json({
      success: true,

      photo: {
        ...photo,

        id:
          photo.photoId,

        mediaType:
          photo.mediaType ||
          getMediaType(
            photo.contentType,
          ),

        downloadUrl,

        url:
          downloadUrl,
      },
    });
  } catch (error) {
    console.error(
      "Get photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// RENAME PHOTO
// PATCH /photos/:photoId
// ==================================================

const renamePhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const {
      name,
    } = req.body || {};

    const userId =
      getUserId(req);

    if (
      !photoId ||
      typeof name !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "photoId and name are required",
      });
    }

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message:
          "Photo name cannot be empty",
      });
    }

    if (
      trimmedName.length > 120
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo name cannot exceed 120 characters",
      });
    }

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      existing.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to rename this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo is in trash. Restore it before renaming.",
      });
    }

    const now =
      new Date().toISOString();

    const result =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          UpdateExpression:
            "SET #name = :name, updatedAt = :updatedAt",

          ExpressionAttributeNames: {
            "#name":
              "name",
          },

          ExpressionAttributeValues: {
            ":name":
              trimmedName,

            ":updatedAt":
              now,
          },

          ReturnValues:
            "ALL_NEW",
        }),
      );

    return res.status(200).json({
      success: true,

      message:
        "Photo renamed successfully",

      photo:
        result.Attributes,
    });
  } catch (error) {
    console.error(
      "Rename photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// MOVE PHOTO
// PATCH /photos/:photoId/folder
// ==================================================

const movePhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const {
      folderId,
    } = req.body || {};

    const userId =
      getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    if (
      folderId !== undefined &&
      folderId !== null &&
      typeof folderId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "folderId must be a string or null",
      });
    }

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      existing.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to move this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo is in trash. Restore it before moving.",
      });
    }

    const normalizedFolderId =
      typeof folderId === "string"
        ? folderId.trim()
        : null;

    if (
      normalizedFolderId
    ) {
      const folderResult =
        await dynamoDb.send(
          new GetCommand({
            TableName:
              getFolderTableName(),

            Key: {
              folderId:
                normalizedFolderId,
            },
          }),
        );

      const folder =
        folderResult.Item;

      if (!folder) {
        return res.status(404).json({
          success: false,
          message:
            "Folder not found",
        });
      }

      if (
        folder.userId !== userId
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not allowed to use this folder",
        });
      }
    }

    const now =
      new Date().toISOString();

    let updateExpression;

    let expressionAttributeValues;

    if (normalizedFolderId) {
      updateExpression =
        "SET folderId = :folderId, updatedAt = :updatedAt";

      expressionAttributeValues = {
        ":folderId":
          normalizedFolderId,

        ":updatedAt":
          now,
      };
    } else {
      updateExpression =
        "SET updatedAt = :updatedAt REMOVE folderId";

      expressionAttributeValues = {
        ":updatedAt":
          now,
      };
    }

    const result =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          UpdateExpression:
            updateExpression,

          ExpressionAttributeValues:
            expressionAttributeValues,

          ReturnValues:
            "ALL_NEW",
        }),
      );

    return res.status(200).json({
      success: true,

      message:
        normalizedFolderId
          ? "Photo moved successfully"
          : "Photo moved to root successfully",

      photo:
        result.Attributes,
    });
  } catch (error) {
    console.error(
      "Move photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// DOWNLOAD PHOTO
// GET /photos/:photoId/download
// ==================================================

const downloadPhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const result =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      result.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to download this file",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Photo is in trash",
      });
    }

    const safeDownloadName =
      sanitizeFileName(
        photo.fileName ||
          photo.originalFileName ||
          photo.name ||
          "download",
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
          `attachment; filename="${safeDownloadName}"`,
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

      downloadUrl:
        signedUrl,
    });
  } catch (error) {
    console.error(
      "Download photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// MOVE PHOTO TO TRASH
// PATCH /photos/:photoId/trash
// ==================================================

const trashPhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      existing.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to trash this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo is already in trash",
      });
    }

    const now =
      new Date().toISOString();

    const result =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          UpdateExpression:
            "SET isTrashed = :isTrashed, trashedAt = :trashedAt, updatedAt = :updatedAt",

          ExpressionAttributeValues: {
            ":isTrashed":
              true,

            ":trashedAt":
              now,

            ":updatedAt":
              now,
          },

          ReturnValues:
            "ALL_NEW",
        }),
      );

    return res.status(200).json({
      success: true,

      message:
        "Photo moved to trash",

      photo:
        result.Attributes,
    });
  } catch (error) {
    console.error(
      "Trash photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// RESTORE PHOTO
// PATCH /photos/:photoId/restore
// ==================================================

const restorePhoto = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      existing.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to restore this photo",
      });
    }

    if (
      photo.isTrashed !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo is not in trash",
      });
    }

    const now =
      new Date().toISOString();

    const result =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          UpdateExpression:
            "SET isTrashed = :isTrashed, updatedAt = :updatedAt REMOVE trashedAt",

          ExpressionAttributeValues: {
            ":isTrashed":
              false,

            ":updatedAt":
              now,
          },

          ReturnValues:
            "ALL_NEW",
        }),
      );

    return res.status(200).json({
      success: true,

      message:
        "Photo restored successfully",

      photo:
        result.Attributes,
    });
  } catch (error) {
    console.error(
      "Restore photo error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// FAVORITE / UNFAVORITE
// PATCH /photos/:photoId/favorite
// ==================================================

const toggleFavorite = async (
  req,
  res,
  next,
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      getUserId(req);

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        }),
      );

    const photo =
      existing.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message:
          "Photo not found",
      });
    }

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to update this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo is in trash. Restore it before changing favorite status.",
      });
    }

    const nextFavorite =
      photo.isFavorite !== true;

    const now =
      new Date().toISOString();

    const result =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          UpdateExpression:
            "SET isFavorite = :isFavorite, updatedAt = :updatedAt",

          ExpressionAttributeValues: {
            ":isFavorite":
              nextFavorite,

            ":updatedAt":
              now,
          },

          ReturnValues:
            "ALL_NEW",
        }),
      );

    return res.status(200).json({
      success: true,

      message:
        nextFavorite
          ? "Photo added to favorites"
          : "Photo removed from favorites",

      photo:
        result.Attributes,
    });
  } catch (error) {
    console.error(
      "Toggle favorite error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// GET FAVORITE PHOTOS
// GET /photos/favorites
// ==================================================

const getFavoritePhotos = async (
  req,
  res,
  next,
) => {
  try {
    const userId =
      getUserId(req);

    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            getTableName(),

          IndexName:
            PHOTO_USER_INDEX_NAME,

          KeyConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },
        }),
      );

    let photos =
      result.Items || [];

    photos =
      photos.filter(
        (photo) =>
          photo.isTrashed !== true &&
          photo.isFavorite === true,
      );

    photos.sort(
      (a, b) =>
        new Date(
          b.createdAt || 0,
        ).getTime() -
        new Date(
          a.createdAt || 0,
        ).getTime(),
    );

    const photosWithUrls =
      await Promise.all(
        photos.map(
          async (photo) => {
            const command =
              new GetObjectCommand({
                Bucket:
                  getBucketName(),

                Key:
                  photo.s3Key,
              });

            const downloadUrl =
              await getSignedUrl(
                s3,
                command,
                {
                  expiresIn:
                    3600,
                },
              );

            return {
              ...photo,

              id:
                photo.photoId,

              mediaType:
                photo.mediaType ||
                getMediaType(
                  photo.contentType,
                ),

              downloadUrl,

              url:
                downloadUrl,
            };
          },
        ),
      );

    return res.status(200).json({
      success: true,

      count:
        photosWithUrls.length,

      photos:
        photosWithUrls,
    });
  } catch (error) {
    console.error(
      "Get favorite photos error:",
      error,
    );

    next(error);
  }
};

// ==================================================
// EXPORT
// ==================================================

module.exports = {
  uploadUrl,
  confirmUpload,
  generateCaptionForPhoto,
  processCaptionJobFromS3Event,
  getPhotos,
  getPhoto,
  renamePhoto,
  movePhoto,
  downloadPhoto,
  trashPhoto,
  restorePhoto,
  toggleFavorite,
  getFavoritePhotos,
};