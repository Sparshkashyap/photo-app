const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
  OAuth2Client,
} = require("google-auth-library");

const {
  isValidEmail,
  isValidPassword,
  isValidName,
} = require("../utils/validation");

const {
  putItem,
  findUserByEmail,
  findUserById,
  updateUserSession,
  clearUserSession,
} = require("./dynamoService");

const {
  generateToken,
} = require("../utils/jwt");

const USERS_TABLE =
  process.env.USERS_TABLE_NAME;

const createSessionToken = (
  userId,
  sessionId
) => {
  return generateToken({
    userId,
    sessionId,
  });
};

const publicUser = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
});

const registerUser = async ({
  name,
  email,
  password,
}) => {
  if (!isValidName(name)) {
    const error = new Error(
      "Name must contain at least 2 characters"
    );

    error.statusCode = 400;

    throw error;
  }

  if (!isValidEmail(email)) {
    const error = new Error(
      "Invalid email format"
    );

    error.statusCode = 400;

    throw error;
  }

  if (!isValidPassword(password)) {
    const error = new Error(
      "Password must contain at least 8 characters"
    );

    error.statusCode = 400;

    throw error;
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const existingUser =
    await findUserByEmail(
      USERS_TABLE,
      normalizedEmail
    );

  if (existingUser) {
    const error = new Error(
      "An account with this email already exists"
    );

    error.statusCode = 409;

    throw error;
  }

  const userId =
    crypto.randomUUID();

  const sessionId =
    crypto.randomUUID();

  const passwordHash =
    await bcrypt.hash(password, 12);

  const now =
    new Date().toISOString();

  const user = {
    userId,

    name: name.trim(),

    email: normalizedEmail,

    passwordHash,

    authProvider: "password",

    createdAt: now,

    activeSessionId: sessionId,

    sessionUpdatedAt: now,
  };

  await putItem(
    USERS_TABLE,
    user
  );

  const token =
    createSessionToken(
      userId,
      sessionId
    );

  return {
    token,

    user: publicUser(user),
  };
};

const loginUser = async ({
  email,
  password,
}) => {
  if (!isValidEmail(email)) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;

    throw error;
  }

  const normalizedEmail =
    email.trim().toLowerCase();

  const user =
    await findUserByEmail(
      USERS_TABLE,
      normalizedEmail
    );

  if (!user) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;

    throw error;
  }

  if (!user.passwordHash) {
    const error = new Error(
      "This account uses social login. Please continue with your social account."
    );

    error.statusCode = 409;

    throw error;
  }

  const passwordMatches =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!passwordMatches) {
    const error = new Error(
      "Invalid email or password"
    );

    error.statusCode = 401;

    throw error;
  }

  if (user.activeSessionId) {
    const error = new Error(
      "Your account is already logged in on another device. Please log out there before logging in here."
    );

    error.statusCode = 409;

    error.code =
      "ACTIVE_SESSION";

    throw error;
  }

  const sessionId =
    crypto.randomUUID();

  await updateUserSession(
    USERS_TABLE,
    user.userId,
    sessionId
  );

  const token =
    createSessionToken(
      user.userId,
      sessionId
    );

  return {
    token,

    user: publicUser(user),
  };
};

/**
 * Google OAuth login
 *
 * Creates a new user if the Google email
 * does not already exist.
 *
 * If the user already exists, the existing
 * DynamoDB user is reused.
 */
const loginWithGoogle = async ({
  idToken,
}) => {
  if (
    !process.env.GOOGLE_CLIENT_ID
  ) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not configured"
    );
  }

  if (!idToken) {
    const error = new Error(
      "Google ID token is required"
    );

    error.statusCode = 400;

    throw error;
  }

  const client =
    new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID
    );

  let ticket;

  try {
    ticket =
      await client.verifyIdToken({
        idToken,

        audience:
          process.env.GOOGLE_CLIENT_ID,
      });
  } catch (error) {
    const authError =
      new Error(
        "Invalid Google authentication token"
      );

    authError.statusCode = 401;

    throw authError;
  }

  const payload =
    ticket.getPayload();

  if (!payload) {
    const error = new Error(
      "Unable to read Google account information"
    );

    error.statusCode = 401;

    throw error;
  }

  const googleId =
    payload.sub;

  const email =
    payload.email
      ?.trim()
      .toLowerCase();

  const name =
    payload.name?.trim() ||
    payload.given_name?.trim() ||
    "Google User";

  if (!googleId || !email) {
    const error = new Error(
      "Google account did not provide required information"
    );

    error.statusCode = 400;

    throw error;
  }

  if (!isValidEmail(email)) {
    const error = new Error(
      "Invalid Google account email"
    );

    error.statusCode = 400;

    throw error;
  }

  let user =
    await findUserByEmail(
      USERS_TABLE,
      email
    );

  /*
   * Existing account
   */
  if (user) {
    /*
     * If this account already has an active
     * session, preserve the same single-device
     * session rule used by password login.
     */
    if (user.activeSessionId) {
      const error = new Error(
        "Your account is already logged in on another device. Please log out there before logging in here."
      );

      error.statusCode = 409;

      error.code =
        "ACTIVE_SESSION";

      throw error;
    }

    const sessionId =
      crypto.randomUUID();

    /*
     * Preserve passwordHash if this was
     * originally a password account.
     */
    user = {
      ...user,

      googleId,

      lastLoginProvider:
        "google",

      activeSessionId:
        sessionId,

      sessionUpdatedAt:
        new Date().toISOString(),
    };

    await putItem(
      USERS_TABLE,
      user
    );
  }

  /*
   * New Google account
   */
  if (!user) {
    const userId =
      crypto.randomUUID();

    const sessionId =
      crypto.randomUUID();

    const now =
      new Date().toISOString();

    user = {
      userId,

      name,

      email,

      googleId,

      authProvider: "google",

      lastLoginProvider:
        "google",

      createdAt: now,

      activeSessionId:
        sessionId,

      sessionUpdatedAt: now,
    };

    await putItem(
      USERS_TABLE,
      user
    );
  }

  const token =
    createSessionToken(
      user.userId,
      user.activeSessionId
    );

  return {
    token,

    user: publicUser(user),
  };
};

const logoutUser = async ({
  userId,
  sessionId,
}) => {
  const user =
    await findUserById(
      USERS_TABLE,
      userId
    );

  if (!user) {
    return;
  }

  if (
    user.activeSessionId &&
    sessionId &&
    user.activeSessionId !== sessionId
  ) {
    return;
  }

  await clearUserSession(
    USERS_TABLE,
    userId,
    sessionId
  );
};

module.exports = {
  registerUser,

  loginUser,

  loginWithGoogle,

  logoutUser,
};