const app = require("./app");

const {
  loadSecrets,
} = require("./src/config/secrets");

const {
  processCaptionJobFromS3Event,
} = require("./src/controllers/photoController");

const serverless = require("serverless-http");

const serverlessApp = serverless(app);

let initializationPromise;

const initialize = async () => {
  await loadSecrets();
};

const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!initializationPromise) {
    initializationPromise = initialize();
  }

  await initializationPromise;

  // S3 ObjectCreated events are handled asynchronously by the same
  // Lambda. They never pass through the public HTTP API/auth layer.
  if (
    Array.isArray(event?.Records) &&
    event.Records.some(
      (record) =>
        record?.eventSource === "aws:s3" ||
        record?.EventSource === "aws:s3",
    )
  ) {
    return processCaptionJobFromS3Event(event);
  }

  return serverlessApp(event, context);
};

module.exports.handler = handler;