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

    if (
      !contentType.startsWith("image/")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only image files are allowed",
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
          contentType,
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

      contentType,

      fileSize:
        fileSize ||
        s3Object.ContentLength ||
        0,

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
    // Query user's photos
    // ------------------------------------------------

    const command =
      new QueryCommand({
        TableName:
          getTableName(),

        IndexName:
          "userId-index",

        KeyConditionExpression:
          "userId = :userId",

        ExpressionAttributeValues: {
          ":userId":
            userId,
        },

        ScanIndexForward:
          false,
      });

    const result =
      await dynamoDb.send(
        command
      );

    let photos =
      result.Items || [];

    // ------------------------------------------------
    // IMPORTANT:
    // Never show trashed photos in normal gallery.
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
      if (
        folderId === "root"
      ) {
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
    // Search
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
              originalFileName.includes(
                search
              ) ||
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
          (photo) => {
            const contentType =
              String(
                photo.contentType ||
                ""
              ).toLowerCase();

            return contentType.startsWith(
              `${type}/`
            );
          }
        );
    }

    // ------------------------------------------------
    // Sorting
    // ------------------------------------------------

    photos.sort(
      (a, b) => {
        if (
          sort === "newest" ||
          sort === "oldest"
        ) {
          const dateA =
            new Date(
              a.createdAt || 0
            ).getTime();

          const dateB =
            new Date(
              b.createdAt || 0
            ).getTime();

          if (
            sort === "newest"
          ) {
            return dateB - dateA;
          }

          return dateA - dateB;
        }

        const nameA =
          String(
            a.name ||
            a.fileName ||
            a.originalFileName ||
            ""
          ).toLowerCase();

        const nameB =
          String(
            b.name ||
            b.fileName ||
            b.originalFileName ||
            ""
          ).toLowerCase();

        const comparison =
          nameA.localeCompare(
            nameB,
            undefined,
            {
              numeric: true,
              sensitivity:
                "base",
            }
          );

        if (
          sort === "name_asc"
        ) {
          return comparison;
        }

        return -comparison;
      }
    );

    // ------------------------------------------------
    // Generate S3 download URLs
    // ------------------------------------------------

    const photosWithUrls =
      await Promise.all(
        photos.map(
          async (photo) => {
            const downloadCommand =
              new GetObjectCommand({
                Bucket:
                  getBucketName(),

                Key:
                  photo.s3Key,
              });

            const photoDownloadUrl =
              await getSignedUrl(
                s3,
                downloadCommand,
                {
                  expiresIn: 300,
                }
              );

            return {
              id:
                photo.photoId,

              photoId:
                photo.photoId,

              userId:
                photo.userId,

              key:
                photo.s3Key,

              s3Key:
                photo.s3Key,

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
                photo.name ||
                "",

              contentType:
                photo.contentType ||
                "",

              fileSize:
                photo.fileSize ||
                0,

              folderId:
                photo.folderId ||
                null,

              // Favorite state
              isFavorite:
                photo.isFavorite === true,

              createdAt:
                photo.createdAt ||
                "",

              uploadedAt:
                photo.createdAt ||
                "",

              updatedAt:
                photo.updatedAt ||
                photo.createdAt ||
                "",

              downloadUrl:
                photoDownloadUrl,

              url:
                photoDownloadUrl,
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
// Move Photo To Trash
// DELETE /photos/:photoId
//
// IMPORTANT:
// This is a SOFT DELETE.
// The S3 object is NOT deleted.
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

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

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
          "You are not allowed to delete this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Photo is already in trash",
        photo,
      });
    }

    const now =
      new Date().toISOString();

    const updateResult =
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
        updateResult.Attributes,
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

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    if (
      typeof name !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo name is required",
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
          "You are not allowed to rename this photo",
      });
    }

    const updatedAt =
      new Date().toISOString();

    const updateResult =
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
              updatedAt,
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
        updateResult.Attributes,
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
// Move Photo To Folder
// PATCH /photos/:photoId/folder
// --------------------------------------------------

const movePhotoToFolder = async (
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

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const userId =
      req.user.userId;

    const photoResult =
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
      photoResult.Item;

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

    // ------------------------------------------------
    // Move to root
    // ------------------------------------------------

    if (
      folderId === null ||
      folderId === undefined ||
      folderId === ""
    ) {
      const updatedAt =
        new Date().toISOString();

      const updateResult =
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
                null,

              ":updatedAt":
                updatedAt,
            },

            ReturnValues:
              "ALL_NEW",
          })
        );

      return res.status(200).json({
        success: true,

        message:
          "Photo moved to root successfully",

        photo:
          updateResult.Attributes,
      });
    }

    // ------------------------------------------------
    // Verify target folder
    // ------------------------------------------------

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

    const updatedAt =
      new Date().toISOString();

    const updateResult =
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
              folderId,

            ":updatedAt":
              updatedAt,
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
        updateResult.Attributes,
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
// GET /photos/download-url?photoId=...
// --------------------------------------------------

const downloadUrl = async (
  req,
  res,
  next
) => {
  try {
    const {
      photoId,
    } = req.query;

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

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
          "You are not allowed to download this photo",
      });
    }

    if (
      photo.isTrashed === true
    ) {
      return res.status(410).json({
        success: false,
        message:
          "This photo is in trash",
      });
    }

    const command =
      new GetObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          photo.s3Key,

        ResponseContentDisposition:
          `attachment; filename="${sanitizeFileName(
            photo.originalFileName ||
            photo.fileName ||
            photo.name ||
            "photo"
          )}"`,

        ResponseContentType:
          photo.contentType,
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

      downloadUrl:
        signedUrl,
    });
  } catch (error) {
    console.error(
      "Generate download URL error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  uploadUrl,
  confirmUpload,
  getPhotos,
  deletePhoto,
  renamePhoto,
  movePhotoToFolder,
  downloadUrl,
};