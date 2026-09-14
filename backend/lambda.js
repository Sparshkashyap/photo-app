// Lambda handler for AWS

const app = require('./src/app');
const serverless = require('serverless-http');

// Export the Lambda handler
module.exports.handler = serverless(app);
