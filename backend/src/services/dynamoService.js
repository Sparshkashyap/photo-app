const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client =
  new DynamoDBClient({
    region:
      process.env.AWS_REGION,
  });

const dynamoDB =
  DynamoDBDocumentClient.from(
    client
  );

const getItem = async (
  tableName,
  key
) => {
  const result =
    await dynamoDB.send(
      new GetCommand({
        TableName:
          tableName,

        Key: key,
      })
    );

  return result.Item;
};

const putItem = async (
  tableName,
  item
) => {
  await dynamoDB.send(
    new PutCommand({
      TableName:
        tableName,

      Item: item,
    })
  );

  return item;
};

const findUserByEmail = async (
  tableName,
  email
) => {
  const result =
    await dynamoDB.send(
      new QueryCommand({
        TableName:
          tableName,

        IndexName:
          "email-index",

        KeyConditionExpression:
          "email = :email",

        ExpressionAttributeValues: {
          ":email": email,
        },

        Limit: 1,
      })
    );

  return (
    result.Items?.[0] ||
    null
  );
};

const findUserById = async (
  tableName,
  userId
) => {
  return getItem(
    tableName,
    {
      userId,
    }
  );
};

/*
 * Returns true only when the existing
 * session has been active recently.
 */
const isSessionActive = (
  sessionUpdatedAt,
  timeoutMs
) => {
  if (!sessionUpdatedAt) {
    return false;
  }

  const updatedAt =
    new Date(
      sessionUpdatedAt
    ).getTime();

  if (
    !Number.isFinite(
      updatedAt
    )
  ) {
    return false;
  }

  const now =
    Date.now();

  return (
    now - updatedAt <
    timeoutMs
  );
};

const updateUserSession = async (
  tableName,
  userId,
  sessionId
) => {
  const result =
    await dynamoDB.send(
      new UpdateCommand({
        TableName:
          tableName,

        Key: {
          userId,
        },

        UpdateExpression:
          "SET activeSessionId = :sessionId, sessionUpdatedAt = :updatedAt",

        ExpressionAttributeValues: {
          ":sessionId":
            sessionId,

          ":updatedAt":
            new Date().toISOString(),
        },

        ReturnValues:
          "ALL_NEW",
      })
    );

  return result.Attributes;
};

/*
 * Refresh the last activity time for
 * the current session.
 */
const touchUserSession = async (
  tableName,
  userId,
  sessionId
) => {
  if (
    !userId ||
    !sessionId
  ) {
    return null;
  }

  const result =
    await dynamoDB.send(
      new UpdateCommand({
        TableName:
          tableName,

        Key: {
          userId,
        },

        UpdateExpression:
          "SET sessionUpdatedAt = :updatedAt",

        ConditionExpression:
          "activeSessionId = :sessionId",

        ExpressionAttributeValues: {
          ":sessionId":
            sessionId,

          ":updatedAt":
            new Date().toISOString(),
        },

        ReturnValues:
          "ALL_NEW",
      })
    );

  return result.Attributes;
};

const clearUserSession = async (
  tableName,
  userId,
  sessionId
) => {
  const user =
    await findUserById(
      tableName,
      userId
    );

  if (!user) {
    return null;
  }

  if (
    sessionId &&
    user.activeSessionId &&
    user.activeSessionId !==
      sessionId
  ) {
    return user;
  }

  const result =
    await dynamoDB.send(
      new UpdateCommand({
        TableName:
          tableName,

        Key: {
          userId,
        },

        UpdateExpression:
          "REMOVE activeSessionId, sessionUpdatedAt",

        ReturnValues:
          "ALL_NEW",
      })
    );

  return result.Attributes;
};

module.exports = {
  getItem,

  putItem,

  findUserByEmail,

  findUserById,

  isSessionActive,

  updateUserSession,

  touchUserSession,

  clearUserSession,
};