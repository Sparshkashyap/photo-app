
const {
  S3Client,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const {
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

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

// --------------------------------------------------
// Get Trash Photos
// GET /trash
// --------------------------------------------------

const getTrashPhotos = async (
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
            "userId-index",

          KeyConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },

          ScanIndexForward:
            false,
        })
      );

    let photos =
      result.Items || [];

    // Only trashed photos
    photos =
      photos.filter(
        (photo) =>
          photo.isTrashed === true
      );

    // Sort newest trashed first
    photos.sort(
      (a, b) => {
        const dateA =
          new Date(
            a.trashedAt ||
            a.updatedAt ||
            a.createdAt ||
            0
          ).getTime();

        const dateB =
          new Date(
            b.trashedAt ||
            b.updatedAt ||
            b.createdAt ||
            0
          ).getTime();

        return dateB - dateA;
      }
    );

    // Generate signed URLs so Trash UI
    // can still show photo thumbnails.
    const photosWithUrls =
      await Promise.all(
        photos.map(
          async (photo) => {
            let downloadUrl = null;

            try {
              const command =
                new GetObjectCommand({
                  Bucket:
                    getBucketName(),

                  Key:
                    photo.s3Key,
                });

              downloadUrl =
                await getSignedUrl(
                  s3,
                  command,
                  {
                    expiresIn: 300,
                  }
                );
            } catch (urlError) {
              console.error(
                `Failed to generate trash URL for ${photo.photoId}:`,
                urlError
              );
            }

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

              createdAt:
                photo.createdAt ||
                "",

              updatedAt:
                photo.updatedAt ||
                photo.createdAt ||
                "",

              trashedAt:
                photo.trashedAt ||
                null,

              isTrashed:
                true,

              downloadUrl,

              url:
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
      "Get trash photos error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Restore Photo
// POST /trash/:photoId/restore
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

    // Security check
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

    const updateResult =
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
        updateResult.Attributes,
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
// Delete Photo Forever
// DELETE /trash/:photoId
//
// Order:
// 1. Verify DynamoDB metadata
// 2. Verify ownership
// 3. Delete S3 object
// 4. Delete DynamoDB metadata
// --------------------------------------------------

const deletePhotoForever = async (
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

    // Security check
    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to permanently delete this photo",
      });
    }

    // Only Trash photos can be permanently deleted
    if (
      photo.isTrashed !== true
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Photo must be in trash before permanent deletion",
      });
    }

    // ------------------------------------------------
    // Delete S3 object
    // ------------------------------------------------

    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket:
            getBucketName(),

          Key:
            photo.s3Key,
        })
      );
    } catch (s3Error) {
      console.error(
        "S3 permanent delete error:",
        s3Error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete photo from storage. DynamoDB metadata was kept safe.",
      });
    }

    // ------------------------------------------------
    // Delete DynamoDB metadata
    // ------------------------------------------------

    try {
      await dynamoDb.send(
        new DeleteCommand({
          TableName:
            getTableName(),

          Key: {
            photoId,
          },

          ConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },
        })
      );
    } catch (dbError) {
      console.error(
        "DynamoDB permanent delete error:",
        dbError
      );

      return res.status(500).json({
        success: false,
        message:
          "Photo storage was deleted, but metadata cleanup failed. Please contact support.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        "Photo permanently deleted",
    });
  } catch (error) {
    console.error(
      "Delete photo forever error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Empty Trash
// DELETE /trash
//
// Permanently deletes ALL photos
// currently in the user's Trash.
// --------------------------------------------------

const emptyTrash = async (
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
            "userId-index",

          KeyConditionExpression:
            "userId = :userId",

          ExpressionAttributeValues: {
            ":userId":
              userId,
          },
        })
      );

    const trashPhotos =
      (result.Items || []).filter(
        (photo) =>
          photo.isTrashed === true
      );

    if (
      trashPhotos.length === 0
    ) {
      return res.status(200).json({
        success: true,
        message:
          "Trash is already empty",
        deletedCount: 0,
        failedCount: 0,
      });
    }

    let deletedCount = 0;
    let failedCount = 0;

    const failures = [];

    // ------------------------------------------------
    // Permanently delete every trash photo
    // ------------------------------------------------

    for (const photo of trashPhotos) {
      try {
        // 1. Delete S3 object
        await s3.send(
          new DeleteObjectCommand({
            Bucket:
              getBucketName(),

            Key:
              photo.s3Key,
          })
        );

        // 2. Delete DynamoDB metadata
        await dynamoDb.send(
          new DeleteCommand({
            TableName:
              getTableName(),

            Key: {
              photoId:
                photo.photoId,
            },

            ConditionExpression:
              "userId = :userId",

            ExpressionAttributeValues: {
              ":userId":
                userId,
            },
          })
        );

        deletedCount++;
      } catch (error) {
        failedCount++;

        console.error(
          `Failed to permanently delete ${photo.photoId}:`,
          error
        );

        failures.push({
          photoId:
            photo.photoId,

          name:
            photo.name ||
            photo.fileName ||
            "Untitled photo",

          message:
            error.message ||
            "Unknown deletion error",
        });
      }
    }

    return res.status(
      failedCount > 0 ? 207 : 200
    ).json({
      success:
        failedCount === 0,

      message:
        failedCount === 0
          ? "Trash emptied successfully"
          : "Trash was partially emptied",

      deletedCount,

      failedCount,

      failures,
    });
  } catch (error) {
    console.error(
      "Empty trash error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  getTrashPhotos,
  restorePhoto,
  deletePhotoForever,
  emptyTrash,
};
