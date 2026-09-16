const {
  SSMClient,
  GetParameterCommand,
} = require("@aws-sdk/client-ssm");

const ssm = new SSMClient({
  region: process.env.AWS_REGION || "ap-south-1",
});

const getSecret = async (name) => {
  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });

  const response = await ssm.send(command);

  if (!response.Parameter?.Value) {
    throw new Error(`SSM parameter not found: ${name}`);
  }

  return response.Parameter.Value;
};

const loadSecrets = async () => {
  const [jwtSecret, mongoUri] = await Promise.all([
    getSecret("/photo-app/JWT_SECRET"),
    getSecret("/photo-app/MONGO_URI"),
  ]);

  process.env.JWT_SECRET = jwtSecret;
  process.env.MONGO_URI = mongoUri;
};

module.exports = {
  loadSecrets,
};