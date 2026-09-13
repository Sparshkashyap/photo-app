// DynamoDB service
// Handles all database operations

const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const getItem = async (tableName, key) => {
  try {
    const params = {
      TableName: tableName,
      Key: key,
    };
    const result = await dynamodb.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error('Error getting item:', error);
    throw error;
  }
};

const putItem = async (tableName, item) => {
  try {
    const params = {
      TableName: tableName,
      Item: item,
    };
    await dynamodb.put(params).promise();
    return item;
  } catch (error) {
    console.error('Error putting item:', error);
    throw error;
  }
};

const deleteItem = async (tableName, key) => {
  try {
    const params = {
      TableName: tableName,
      Key: key,
    };
    await dynamodb.delete(params).promise();
    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

module.exports = {
  getItem,
  putItem,
  deleteItem,
};
