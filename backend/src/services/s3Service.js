// S3 service
// Handles file storage operations

const AWS = require('aws-sdk');
const s3 = new AWS.S3();

const uploadFile = async (bucket, key, buffer) => {
  try {
    const params = {
      Bucket: bucket,
      Key: key,
      Body: buffer,
    };
    const result = await s3.upload(params).promise();
    return result;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

const getFile = async (bucket, key) => {
  try {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    const result = await s3.getObject(params).promise();
    return result;
  } catch (error) {
    console.error('Error getting file:', error);
    throw error;
  }
};

const deleteFile = async (bucket, key) => {
  try {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    await s3.deleteObject(params).promise();
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  getFile,
  deleteFile,
};
