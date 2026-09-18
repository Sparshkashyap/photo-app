const crypto = require("crypto");

const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");

// --------------------------------------------------
// DynamoDB
// --------------------------------------------------

const dynamoClient =
  new DynamoDBClient({
    region:
      process.env.AWS_REGION ||
      "ap-south-1",
  });

const dynamoDb =
  DynamoDBDocumentClient.from(
    dynamoClient
  );

// --------------------------------------------------
// Helpers
// --------------------------------------------------

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

// --------------------------------------------------
// Create Folder
// POST /folders
// --------------------------------------------------

const createFolder = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
    } = req.body;

    if (
      typeof name !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Folder name is required",
      });
    }

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message:
          "Folder name cannot be empty",
      });
    }

    if (
      trimmedName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Folder name cannot exceed 100 characters",
      });
    }

    const userId =
      req.user.userId;

    const folderId =
      crypto.randomUUID();

    const now =
      new Date().toISOString();

    const folder = {
      folderId,

      userId,

      name:
        trimmedName,

      createdAt: now,

      updatedAt: now,
    };

    await dynamoDb.send(
      new PutCommand({
        TableName:
          getFolderTableName(),

        Item: folder,

        ConditionExpression:
          "attribute_not_exists(folderId)",
      })
    );

    return res.status(201).json({
      success: true,

      message:
        "Folder created successfully",

      folder,
    });
  } catch (error) {
    console.error(
      "Create folder error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Get User Folders
// GET /folders
// --------------------------------------------------

const getFolders = async (
  req,
  res,
  next
) => {
  try {
    const userId =
      req.user.userId;

    const command =
      new QueryCommand({
        TableName:
          getFolderTableName(),

        IndexName:
          "userId-index",

        KeyConditionExpression:
          "userId = :userId",

        ExpressionAttributeValues: {
          ":userId": userId,
        },
      });

    const result =
      await dynamoDb.send(
        command
      );

    let folders =
      result.Items || [];

    folders.sort(
      (a, b) => {
        const dateA =
          new Date(
            a.createdAt || 0
          ).getTime();

        const dateB =
          new Date(
            b.createdAt || 0
          ).getTime();

        return dateB - dateA;
      }
    );

    return res.status(200).json({
      success: true,

      count:
        folders.length,

      folders,
    });
  } catch (error) {
    console.error(
      "Get folders error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Rename Folder
// PATCH /folders/:folderId
// --------------------------------------------------

const renameFolder = async (
  req,
  res,
  next
) => {
  try {
    const {
      folderId,
    } = req.params;

    const {
      name,
    } = req.body;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message:
          "folderId is required",
      });
    }

    if (
      typeof name !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Folder name is required",
      });
    }

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      return res.status(400).json({
        success: false,
        message:
          "Folder name cannot be empty",
      });
    }

    if (
      trimmedName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Folder name cannot exceed 100 characters",
      });
    }

    const userId =
      req.user.userId;

    // ----------------------------------------------
    // Verify folder ownership
    // ----------------------------------------------

    const getResult =
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
      getResult.Item;

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
          "You are not allowed to rename this folder",
      });
    }

    const updatedAt =
      new Date().toISOString();

    const updateResult =
      await dynamoDb.send(
        new UpdateCommand({
          TableName:
            getFolderTableName(),

          Key: {
            folderId,
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

    return res.status(200).json({
      success: true,

      message:
        "Folder renamed successfully",

      folder:
        updateResult.Attributes,
    });
  } catch (error) {
    console.error(
      "Rename folder error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Delete Folder
// DELETE /folders/:folderId
// --------------------------------------------------

const deleteFolder = async (
  req,
  res,
  next
) => {
  try {
    const {
      folderId,
    } = req.params;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        message:
          "folderId is required",
      });
    }

    const userId =
      req.user.userId;

    // ----------------------------------------------
    // Verify ownership
    // ----------------------------------------------

    const getResult =
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
      getResult.Item;

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
          "You are not allowed to delete this folder",
      });
    }

    // ----------------------------------------------
    // Delete folder
    //
    // Photos are NOT deleted.
    // Photo objects in S3 remain safe.
    // ----------------------------------------------

    await dynamoDb.send(
      new DeleteCommand({
        TableName:
          getFolderTableName(),

        Key: {
          folderId,
        },

        ConditionExpression:
          "userId = :userId",

        ExpressionAttributeValues: {
          ":userId": userId,
        },
      })
    );

    return res.status(200).json({
      success: true,

      message:
        "Folder deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete folder error:",
      error
    );

    next(error);
  }
};

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  createFolder,
  getFolders,
  renameFolder,
  deleteFolder,
};