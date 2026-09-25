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
    throw new Error(
      `SSM parameter not found: ${name}`
    );
  }

  return response.Parameter.Value;
};

const loadSecrets = async () => {
  const [
    jwtSecret,
    googleClientId,
    googleClientSecret,
  ] = await Promise.all([
    getSecret("/photo-app/JWT_SECRET"),
    getSecret("/photo-app/GOOGLE_CLIENT_ID"),
    getSecret("/photo-app/GOOGLE_CLIENT_SECRET"),
  ]);

  process.env.JWT_SECRET = jwtSecret;
  process.env.GOOGLE_CLIENT_ID = googleClientId;
  process.env.GOOGLE_CLIENT_SECRET =
    googleClientSecret;
};

module.exports = {
  loadSecrets,
};