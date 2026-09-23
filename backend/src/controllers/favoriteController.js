const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const REGION =
  process.env.AWS_REGION || "ap-south-1";

const dynamoClient = new DynamoDBClient({
  region: REGION,
});

const dynamoDb =
  DynamoDBDocumentClient.from(
    dynamoClient,
  );

function getTableName() {
  const tableName =
    process.env.DYNAMODB_TABLE;

  if (!tableName) {
    throw new Error(
      "DYNAMODB_TABLE is not configured",
    );
  }

  return tableName;
}

async function setFavorite(
  req,
  res,
  next,
) {
  try {
    const { photoId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!photoId) {
      return res.status(400).json({
        success: false,
        message: "Photo ID is required",
      });
    }

    const isFavorite =
      req.body?.isFavorite === true;

    const photoResult = await dynamoDb.send(
      new GetCommand({
        TableName: getTableName(),
        Key: {
          photoId,
        },
      }),
    );

    const photo = photoResult.Item;

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: "Photo not found",
      });
    }

    if (photo.userId !== userId) {
      return res.status(403).json({
        success: false,
        message:
          "You are not allowed to modify this photo",
      });
    }

    if (photo.isTrashed === true) {
      return res.status(410).json({
        success: false,
        message:
          "Photos in Trash cannot be favorited",
      });
    }

    const updatedAt =
      new Date().toISOString();

    const result = await dynamoDb.send(
      new UpdateCommand({
        TableName: getTableName(),

        Key: {
          photoId,
        },

        UpdateExpression:
          "SET isFavorite = :isFavorite, updatedAt = :updatedAt",

        ExpressionAttributeValues: {
          ":isFavorite": isFavorite,
          ":updatedAt": updatedAt,
        },

        ReturnValues: "ALL_NEW",
      }),
    );

    return res.status(200).json({
      success: true,

      message: isFavorite
        ? "Photo added to favorites"
        : "Photo removed from favorites",

      photo: result.Attributes,
    });
  } catch (error) {
    console.error(
      "setFavorite error:",
      error,
    );

    next(error);
  }
}

module.exports = {
  setFavorite,
};