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

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

// IMPORTANT:
// Keep this variable name as `dynamoDb`
// because all DynamoDB operations below use `dynamoDb`.
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

const sanitizeFileName = (fileName) => {
  const originalName =
    path.basename(fileName);

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
      !contentType.startsWith(
        "image/"
      )
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

    // ------------------------------------------------
    // Validate custom photo name
    // ------------------------------------------------

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
    // User can only save photos inside own folder.
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
    // Verify object exists in S3
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
    // Save metadata in DynamoDB
    // ------------------------------------------------

    const now =
      new Date().toISOString();

    const item = {
      photoId,

      userId,

      // Custom user-visible name
      name: trimmedName,

      // Original uploaded filename
      originalFileName:
        fileName,

      // Backward compatibility
      fileName,

      // S3 object key
      s3Key: key,

      contentType,

      fileSize:
        fileSize ||
        s3Object.ContentLength ||
        0,

      createdAt: now,

      updatedAt: now,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName:
          getTableName(),

        Item: item,
      })
    );

    return res.status(201).json({
      success: true,
      message:
        "Photo metadata saved",
      photo: item,
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
// --------------------------------------------------

const getPhotos = async (
  req,
  res,
  next
) => {
  try {
    // ----------------------------------------------
    // Authenticated user
    // ----------------------------------------------

    const userId =
      req.user.userId;

    // ----------------------------------------------
    // Query parameters
    // ----------------------------------------------

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

    // ----------------------------------------------
    // Validation
    // ----------------------------------------------

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

    // ----------------------------------------------
    // DynamoDB Query
    //
    // IMPORTANT:
    // Only query authenticated user's photos.
    // Uses userId-index.
    // ----------------------------------------------

    const command =
      new QueryCommand({
        TableName:
          getTableName(),

        IndexName:
          "userId-index",

        KeyConditionExpression:
          "userId = :userId",

        ExpressionAttributeValues: {
          ":userId": userId,
        },

        ScanIndexForward: false,
      });

    // IMPORTANT:
    // Use `dynamoDb`, not `dynamo`.
    const result =
      await dynamoDb.send(
        command
      );

    let photos =
      result.Items || [];

    // ----------------------------------------------
    // Search
    // ----------------------------------------------

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
              name.includes(
                search
              ) ||
              originalFileName.includes(
                search
              ) ||
              fileName.includes(
                search
              )
            );
          }
        );
    }

    // ----------------------------------------------
    // Type filter
    // ----------------------------------------------

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

    // ----------------------------------------------
    // Sorting
    // ----------------------------------------------

    photos.sort(
      (a, b) => {
        // ------------------------------------------
        // Date sorting
        // ------------------------------------------

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
            return (
              dateB - dateA
            );
          }

          return (
            dateA - dateB
          );
        }

        // ------------------------------------------
        // Name sorting
        // ------------------------------------------

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

    // ----------------------------------------------
    // Generate S3 download URLs
    // ----------------------------------------------

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

            const downloadUrl =
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

              downloadUrl,

              url: downloadUrl,
            };
          }
        )
      );

    // ----------------------------------------------
    // Response
    // ----------------------------------------------

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
// Rename Photo
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
      typeof name !==
      "string"
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

    // ------------------------------------------------
    // Verify ownership
    // ------------------------------------------------

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

    // ------------------------------------------------
    // Update only metadata
    //
    // S3 object is NOT renamed.
    // ------------------------------------------------

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
            "#name": "name",
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

    const updatedPhoto =
      updateResult.Attributes;

    return res.status(200).json({
      success: true,
      message:
        "Photo renamed successfully",
      photo:
        updatedPhoto,
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
// Generate S3 Download URL
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

    if (
      !photoId ||
      typeof photoId !==
        "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "photoId is required",
      });
    }

    const userId =
      req.user.userId;

    // ------------------------------------------------
    // Get photo metadata
    // ------------------------------------------------

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

    // ------------------------------------------------
    // Ownership check
    // ------------------------------------------------

    if (
      photo.userId !== userId
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to access this photo",
      });
    }

    // ------------------------------------------------
    // Generate S3 download URL
    // ------------------------------------------------

    const command =
      new GetObjectCommand({
        Bucket:
          getBucketName(),

        Key:
          photo.s3Key,

        ResponseContentDisposition:
          `attachment; filename="${sanitizeFileName(
            photo.originalFileName ||
              photo.fileName
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
  renamePhoto,
  downloadUrl,
};