const app = require("./app");

const {
  loadSecrets,
} = require("./src/config/secrets");

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

  return serverlessApp(event, context);
};

module.exports.handler = handler;