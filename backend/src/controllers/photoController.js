const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require("@aws-sdk/client-s3");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

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

const crypto = require("crypto");
const path = require("path");

const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "audio/mp3",
]);

const isAllowedContentType = (contentType) =>
  ALLOWED_CONTENT_TYPES.has(
    String(contentType || "").toLowerCase().trim(),
  );

// --------------------------------------------------
// AWS Clients
// --------------------------------------------------

const AWS_REGION =
  process.env.AWS_REGION || "ap-south-1";

const s3 = new S3Client({
  region: AWS_REGION,
});

const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
});

const dynamoDb =
  DynamoDBDocumentClient.from(dynamoClient);

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const getBucketName = () => {
  const bucketName =
    process.env.S3_BUCKET_NAME;

  if (!bucketName) {
    throw new Error(
      "S3_BUCKET_NAME is not configured"
    );
  }

  return bucketName;
};

const getTableName = () => {
  const tableName =
    process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error(
      "DYNAMODB_TABLE is not configured"
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
      "FOLDER_TABLE is not configured"
    );
  }

  return tableName;
};

const sanitizeFileName = (fileName) => {
  const originalName =
    path.basename(fileName || "");

  return originalName
    .replace(
      /[^a-zA-Z0-9._-]/g,
      "-"
    )
    .replace(
      /-+/g,
      "-"
    );
};

// --------------------------------------------------
// Generate S3 Upload URL
// POST /photos/upload-url
// --------------------------------------------------

const uploadUrl = async (
  req,
  res,
  next
) => {
  try {
    const {
      fileName,
      contentType,
    } = req.body;

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
      String(contentType).toLowerCase().trim();

    if (!isAllowedContentType(normalizedContentType)) {
      return res.status(400).json({
        success: false,
        message:
          "Unsupported file type. Allowed files are JPG, JPEG, PNG, WEBP, MP4 and MP3",
      });
    }

    const userId =
      req.user.userId;

    const photoId =
      crypto.randomUUID();

    const safeFileName =
      sanitizeFileName(fileName);

    const key =
      `photos/${userId}/${photoId}-${safeFileName}`;

    const command =
      new PutObjectCommand({
        Bucket:
          getBucketName(),

        Key: key,

        ContentType:
          normalizedContentType,
      });

    const signedUrl =
      await getSignedUrl(
        s3,
        command,
        {
          expiresIn: 300,
        }
      );

    return res.status(200).json({
      success: true,
      uploadUrl: signedUrl,
      key,
      photoId,
    });
  } catch (error) {
    console.error(
      "Generate upload URL error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Confirm S3 Upload + Save DynamoDB Metadata
// POST /photos/confirm
// --------------------------------------------------

const confirmUpload = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
      key,
      fileName,
      contentType,
      fileSize,
      name,
      folderId,
    } = req.body;

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

    const userId =
      req.user.userId;

    const trimmedName =
      name.trim();

    if (
      trimmedName.length < 1
    ) {
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

    // ------------------------------------------------
    // Security:
    // User can only save photos inside own S3 prefix.
    // ------------------------------------------------

    const expectedPrefix =
      `photos/${userId}/`;

    if (
      !key.startsWith(
        expectedPrefix
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to save this photo",
      });
    }

    // ------------------------------------------------
    // Verify folder ownership
    // ------------------------------------------------

    if (
      folderId !== undefined &&
      folderId !== null &&
      folderId !== ""
    ) {
      const folderResult =
        await dynamoDb.send(
          new GetCommand({
            TableName:
              getFolderTableName(),

            Key: {
              folderId,
            },
          })
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

    // ------------------------------------------------
    // Verify S3 object
    // ------------------------------------------------

    const headCommand =
      new HeadObjectCommand({
        Bucket:
          getBucketName(),

        Key: key,
      });

    const s3Object =
      await s3.send(
        headCommand
      );

    const actualContentType =
      String(
        s3Object.ContentType || contentType || "",
      ).toLowerCase().trim();

    const actualFileSize =
      Number(s3Object.ContentLength || 0);

    if (!isAllowedContentType(actualContentType)) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file type is not supported",
      });
    }

    if (actualFileSize <= 0) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is empty or invalid",
      });
    }

    if (actualFileSize > MAX_UPLOAD_SIZE_BYTES) {
      return res.status(400).json({
        success: false,
        message: "File size cannot exceed 100 MB",
      });
    }

    // ------------------------------------------------
    // Save metadata
    // ------------------------------------------------

    const now =
      new Date().toISOString();

    const item = {
      photoId,

      userId,

      name:
        trimmedName,

      originalFileName:
        fileName,

      fileName,

      s3Key:
        key,

      contentType:
        actualContentType,

      fileSize:
        actualFileSize,

      folderId:
        folderId || null,

      // Trash state
      isTrashed:
        false,

      // Favorite state
      isFavorite:
        false,

      createdAt:
        now,

      updatedAt:
        now,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName:
          getTableName(),

        Item:
          item,
      })
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Get Current User Photos
// GET /photos
// --------------------------------------------------

const getPhotos = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

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
        ? req.query.folderId
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

    // ------------------------------------------------
    // Verify requested folder
    // ------------------------------------------------

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
          })
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

    // ------------------------------------------------
    // Query photos
    // ------------------------------------------------

    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            getTableName(),

          IndexName:
            "UserIdIndex",

          KeyConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },
        })
      );

    let photos =
      result.Items || [];

    // ------------------------------------------------
    // Only active photos
    // ------------------------------------------------

    photos =
      photos.filter(
        (photo) =>
          photo.isTrashed !== true
      );

    // ------------------------------------------------
    // Folder filter
    // ------------------------------------------------

    if (folderId) {
      if (folderId === "root") {
        photos =
          photos.filter(
            (photo) =>
              !photo.folderId
          );
      } else {
        photos =
          photos.filter(
            (photo) =>
              photo.folderId ===
              folderId
          );
      }
    }

    // ------------------------------------------------
    // Search filter
    // ------------------------------------------------

    if (search) {
      photos =
        photos.filter(
          (photo) => {
            const name =
              String(
                photo.name || ""
              ).toLowerCase();

            const originalFileName =
              String(
                photo.originalFileName ||
                  ""
              ).toLowerCase();

            const fileName =
              String(
                photo.fileName || ""
              ).toLowerCase();

            return (
              name.includes(search) ||
              originalFileName.includes(search) ||
              fileName.includes(search)
            );
          }
        );
    }

    // ------------------------------------------------
    // Type filter
    // ------------------------------------------------

    if (type !== "all") {
      photos =
        photos.filter(
          (photo) =>
            String(
              photo.contentType || ""
            ).startsWith(
              `${type}/`
            )
        );
    }

    // ------------------------------------------------
    // Sort
    // ------------------------------------------------

    photos.sort(
      (a, b) => {
        if (
          sort === "name_asc"
        ) {
          return String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            )
          );
        }

        if (
          sort === "name_desc"
        ) {
          return String(
            b.name || ""
          ).localeCompare(
            String(
              a.name || ""
            )
          );
        }

        const aTime =
          new Date(
            a.createdAt || 0
          ).getTime();

        const bTime =
          new Date(
            b.createdAt || 0
          ).getTime();

        if (
          sort === "oldest"
        ) {
          return aTime - bTime;
        }

        return bTime - aTime;
      }
    );

    // ------------------------------------------------
    // Generate signed URLs
    // ------------------------------------------------

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
                }
              );

            return {
              ...photo,
              downloadUrl,
            };
          }
        )
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Get Single Photo
// GET /photos/:photoId
// --------------------------------------------------

const getPhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user.userId;

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
        })
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
          expiresIn:
            3600,
        }
      );

    return res.status(200).json({
      success: true,

      photo: {
        ...photo,
        downloadUrl,
      },
    });
  } catch (error) {
    console.error(
      "Get photo error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Rename Photo
// PATCH /photos/:photoId
// --------------------------------------------------

const renamePhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const {
      name,
    } = req.body;

    const userId =
      req.user.userId;

    if (!photoId || !name) {
      return res.status(400).json({
        success: false,
        message:
          "photoId and name are required",
      });
    }

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

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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
        })
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Move Photo
// PATCH /photos/:photoId/move
// --------------------------------------------------

const movePhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const {
      folderId,
    } = req.body;

    const userId =
      req.user.userId;

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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

    const normalizedFolderId =
      folderId || null;

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
          })
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

    const result =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          UpdateExpression:
            "SET folderId = :folderId, updatedAt = :updatedAt",

          ExpressionAttributeValues: {
            ":folderId":
              normalizedFolderId,

            ":updatedAt":
              now,
          },

          ReturnValues:
            "ALL_NEW",
        })
      );

    return res.status(200).json({
      success: true,

      message:
        "Photo moved successfully",

      photo:
        result.Attributes,
    });
  } catch (error) {
    console.error(
      "Move photo error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Generate Download URL
// GET /photos/:photoId/download
// --------------------------------------------------

const downloadPhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user.userId;

    const result =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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

    const command =
      new GetObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          photo.s3Key,

        ResponseContentType:
          photo.contentType,

        ResponseContentDisposition:
          `attachment; filename="${encodeURIComponent(
            photo.fileName || "download"
          )}"`,
      });

    const downloadUrl =
      await getSignedUrl(
        s3,
        command,
        {
          expiresIn:
            300,
        }
      );

    return res.status(200).json({
      success: true,

      downloadUrl,
    });
  } catch (error) {
    console.error(
      "Download photo error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Trash Photo
// PATCH /photos/:photoId/trash
// --------------------------------------------------

const trashPhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user.userId;

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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
        })
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Restore Photo
// PATCH /photos/:photoId/restore
// --------------------------------------------------

const restorePhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user.userId;

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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
        })
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Permanently Delete Photo
// DELETE /photos/:photoId
// --------------------------------------------------

const deletePhoto = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user.userId;

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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
          "You are not allowed to delete this photo",
      });
    }

    const { DeleteObjectCommand } =
      require("@aws-sdk/client-s3");

    await s3.send(
      new DeleteObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          photo.s3Key,
      })
    );

    const {
      DeleteCommand,
    } =
      require("@aws-sdk/lib-dynamodb");

    await dynamoDb.send(
      new DeleteCommand({
        TableName:
          getTableName(),

        Key: {
          photoId,
        },
      })
    );

    return res.status(200).json({
      success: true,

      message:
        "Photo permanently deleted",
    });
  } catch (error) {
    console.error(
      "Delete photo error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Favorite / Unfavorite
// PATCH /photos/:photoId/favorite
// --------------------------------------------------

const toggleFavorite = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.params;

    const userId =
      req.user.userId;

    const existing =
      await dynamoDb.send(
        new GetCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },
        })
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
        })
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Get Favorite Photos
// GET /photos/favorites
// --------------------------------------------------

const getFavoritePhotos = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

    const result =
      await dynamoDb.send(
        new QueryCommand({
          TableName:
            getTableName(),

          IndexName:
            "UserIdIndex",

          KeyConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },
        })
      );

    let photos =
      result.Items || [];

    photos =
      photos.filter(
        (photo) =>
          photo.isTrashed !== true &&
          photo.isFavorite === true
      );

    photos.sort(
      (a, b) =>
        new Date(
          b.createdAt || 0
        ).getTime() -
        new Date(
          a.createdAt || 0
        ).getTime()
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
                }
              );

            return {
              ...photo,
              downloadUrl,
            };
          }
        )
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
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Export
// --------------------------------------------------

module.exports = {
  uploadUrl,
  confirmUpload,
  getPhotos,
  getPhoto,
  renamePhoto,
  movePhoto,
  downloadPhoto,
  trashPhoto,
  restorePhoto,
  deletePhoto,
  toggleFavorite,
  getFavoritePhotos,
};