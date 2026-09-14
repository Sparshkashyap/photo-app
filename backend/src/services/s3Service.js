const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const createUploadUrl = async ({
  key,
  contentType,
}) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 300,
  });
};

const createDownloadUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3, command, {
    expiresIn: 300,
  });
};

module.exports = {
  createUploadUrl,
  createDownloadUrl,
};