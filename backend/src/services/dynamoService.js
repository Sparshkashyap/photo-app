const {
  DynamoDBClient,
} = require("@aws-sdk/client-dynamodb");

const {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const dynamoDB = DynamoDBDocumentClient.from(client);

const getItem = async (tableName, key) => {
  const result = await dynamoDB.send(
    new GetCommand({
      TableName: tableName,
      Key: key,
    })
  );

  return result.Item;
};

const putItem = async (tableName, item) => {
  await dynamoDB.send(
    new PutCommand({
      TableName: tableName,
      Item: item,
    })
  );

  return item;
};

const findUserByEmail = async (tableName, email) => {
  const result = await dynamoDB.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "email-index",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
      Limit: 1,
    })
  );

  return result.Items?.[0] || null;
};

module.exports = {
  getItem,
  putItem,
  findUserByEmail,
};