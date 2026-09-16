const app = require("./app");
const connectDB = require("./src/config/database");
const { loadSecrets } = require("./src/config/secrets");
const serverless = require("serverless-http");

const serverlessApp = serverless(app);

let initializationPromise;

const initialize = async () => {
  await loadSecrets();
  await connectDB();
};

const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!initializationPromise) {
    initializationPromise = initialize();
  }

  await initializationPromise;

  return serverlessApp(event, context);
};

module.exports.handler = handler;