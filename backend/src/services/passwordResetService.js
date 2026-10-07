const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const { findUserByEmail } = require("./dynamoService");
const { getSecret } = require("../config/secrets");

const USERS_TABLE = process.env.USERS_TABLE_NAME;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const hashOtp = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:8080").replace(/\/+$/, "");

const hmac = (key, value) => crypto.createHmac("sha256", key).update(value).digest();
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const sendResetEmail = async ({ email, otp }) => {
  const fromEmail = String(
    process.env.PASSWORD_RESET_FROM_EMAIL ||
      (await getSecret("/photo-app/PASSWORD_RESET_FROM_EMAIL")) ||
      "",
  ).trim();

  if (!fromEmail || fromEmail.includes("YOUR_VERIFIED_EMAIL")) {
    throw new Error(
      "Password reset sender email is not configured. Set /photo-app/PASSWORD_RESET_FROM_EMAIL to a verified SES identity in ap-south-1.",
    );
  }
  const region = process.env.AWS_REGION || "ap-south-1";
  const service = "ses";
  const host = `email.${region}.amazonaws.com`;
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (!accessKey || !secretKey) {
    throw new Error("AWS credentials are not available for sending password reset email");
  }

  const body = JSON.stringify({
    FromEmailAddress: fromEmail,
    Destination: { ToAddresses: [email] },
    Content: {
      Simple: {
        Subject: { Data: "Photo-App password reset code", Charset: "UTF-8" },
        Body: {
          Html: {
            Data: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#171717"><h2>Reset your Photo-App password</h2><p>Use this verification code to reset your password:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes and can be used only once.</p><p>If you did not request this, you can safely ignore this email.</p></body></html>`,
            Charset: "UTF-8",
          },
          Text: {
            Data: `Your Photo-App password reset code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
            Charset: "UTF-8",
          },
        },
      },
    },
  });

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hash(body);
  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    ...(sessionToken ? [`x-amz-security-token:${sessionToken}`] : []),
  ].join("\n") + "\n";
  const signedHeaders = [
    "content-type",
    "host",
    "x-amz-date",
    ...(sessionToken ? ["x-amz-security-token"] : []),
  ].join(";");
  const canonicalRequest = ["POST", "/v2/email/outbound-emails", "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}/v2/email/outbound-emails`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "host": host,
      "x-amz-date": amzDate,
      ...(sessionToken ? { "x-amz-security-token": sessionToken } : {}),
      Authorization: authorization,
    },
    body,
  });

  if (!response.ok) {
    const details = await response.text();
    const normalizedDetails = details.toLowerCase();

    if (normalizedDetails.includes("not verified") || normalizedDetails.includes("emailaddressnotverified")) {
      throw new Error(
        "Amazon SES rejected the password reset email because the sender or recipient is not verified in ap-south-1. Verify both email identities in SES or move SES out of sandbox mode.",
      );
    }

    throw new Error(`Password reset email could not be sent: ${response.status} ${details.slice(0, 300)}`);
  }
};

const requestPasswordReset = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  const genericResponse = {
    success: true,
    message: "If an account exists for that email, a verification code has been sent.",
  };

  const user = await findUserByEmail(USERS_TABLE, normalizedEmail);

  if (!user || !user.passwordHash) {
    return genericResponse;
  }

  const lastRequestedAt = user.passwordResetRequestedAt
    ? new Date(user.passwordResetRequestedAt).getTime()
    : 0;

  if (lastRequestedAt && Date.now() - lastRequestedAt < 60 * 1000) {
    return genericResponse;
  }

  const otp = String(crypto.randomInt(100000, 1000000));
  const now = Date.now();
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

  // Send first. This prevents a failed SES request from consuming the user's
  // 60-second retry window or leaving an OTP stored that was never delivered.
  await sendResetEmail({ email: normalizedEmail, otp });

  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" }));

  await db.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId: user.userId },
    UpdateExpression: "SET passwordResetOtpHash = :hash, passwordResetOtpExpiresAt = :expiresAt, passwordResetOtpAttempts = :attempts, passwordResetRequestedAt = :requestedAt",
    ExpressionAttributeValues: {
      ":hash": hashOtp(otp),
      ":expiresAt": expiresAt,
      ":attempts": 0,
      ":requestedAt": new Date(now).toISOString(),
    },
  }));

  return genericResponse;
};

const verifyPasswordResetOtp = async (email, otp) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const cleanOtp = String(otp || "").trim();
  const user = await findUserByEmail(USERS_TABLE, normalizedEmail);

  if (!user || !user.passwordHash) {
    throw new Error("Invalid or expired verification code");
  }

  const expired = !user.passwordResetOtpExpiresAt || Date.now() > new Date(user.passwordResetOtpExpiresAt).getTime();
  const attempts = Number(user.passwordResetOtpAttempts || 0);

  if (expired || attempts >= OTP_MAX_ATTEMPTS || !/^\d{6}$/.test(cleanOtp)) {
    throw new Error("Invalid or expired verification code");
  }

  const actualHash = hashOtp(cleanOtp);
  const storedHash = String(user.passwordResetOtpHash || "");
  const valid = storedHash.length === actualHash.length && crypto.timingSafeEqual(
    Buffer.from(actualHash),
    Buffer.from(storedHash),
  );

  if (!valid) {
    const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" }));
    await db.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId: user.userId },
      UpdateExpression: "SET passwordResetOtpAttempts = :attempts",
      ExpressionAttributeValues: { ":attempts": attempts + 1 },
    }));
    throw new Error("Invalid or expired verification code");
  }

  return user.userId;
};

const resetPassword = async ({ email, otp, password }) => {
  const userId = await verifyPasswordResetOtp(email, otp);
  const passwordHash = await bcrypt.hash(password, 12);
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || "ap-south-1" }));
  const sessionId = crypto.randomUUID();

  await db.send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: "SET passwordHash = :passwordHash, activeSessionId = :sessionId, sessionUpdatedAt = :updatedAt REMOVE passwordResetOtpHash, passwordResetOtpExpiresAt, passwordResetOtpAttempts, passwordResetRequestedAt",
    ExpressionAttributeValues: {
      ":passwordHash": passwordHash,
      ":sessionId": sessionId,
      ":updatedAt": new Date().toISOString(),
    },
  }));

  return { userId, sessionId };
};

module.exports = {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
};
