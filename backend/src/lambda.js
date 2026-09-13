// Lambda handler for AWS

const app = require('./app');
const serverless = require('serverless-http');

// Export the Lambda handler
module.exports.handler = serverless(app);
