const crypto = require("crypto");

const {
  OAuth2Client,
} = require("google-auth-library");

const {
  findUserByEmail,
  putItem,
  updateUserSession,
} = require("./dynamoService");

const {
  generateToken,
} = require("../utils/jwt");

const USERS_TABLE =
  process.env.USERS_TABLE_NAME;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:8080";

const GOOGLE_CALLBACK_PATH =
  "/auth/google/callback";

const getGoogleClient = () => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET
  ) {
    throw new Error(
      "Google OAuth credentials are not configured"
    );
  }

  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getGoogleRedirectUri()
  );
};

const getGoogleRedirectUri = () => {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }

  /*
   * API Gateway URL is supplied through the
   * GOOGLE_REDIRECT_URI environment variable
   * in production.
   *
   * Local fallback:
   */
  return (
    "http://localhost:5000" +
    GOOGLE_CALLBACK_PATH
  );
};

const getGoogleAuthorizationUrl = ({
  state,
}) => {
  const client =
    getGoogleClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "select_account",
    scope: [
      "openid",
      "email",
      "profile",
    ],
    state,
  });
};

const verifyGoogleCode = async (
  code
) => {
  const client =
    getGoogleClient();

  const {
    tokens,
  } = await client.getToken(code);

  if (!tokens.id_token) {
    throw new Error(
      "Google did not return an ID token"
    );
  }

  const ticket =
    await client.verifyIdToken({
      idToken:
        tokens.id_token,

      audience:
        process.env.GOOGLE_CLIENT_ID,
    });

  const payload =
    ticket.getPayload();

  if (!payload) {
    throw new Error(
      "Unable to read Google account information"
    );
  }

  return {
    googleId:
      payload.sub,

    email:
      payload.email
        ?.trim()
        .toLowerCase(),

    name:
      payload.name ||
      payload.given_name ||
      "Google User",

    picture:
      payload.picture || null,

    emailVerified:
      payload.email_verified === true,
  };
};

const publicUser = (
  user
) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
});

const loginWithGoogle = async ({
  code,
}) => {
  const googleUser =
    await verifyGoogleCode(code);

  if (!googleUser.email) {
    const error = new Error(
      "Google account email was not available"
    );

    error.statusCode = 400;

    throw error;
  }

  if (!googleUser.emailVerified) {
    const error = new Error(
      "Google email is not verified"
    );

    error.statusCode = 400;

    throw error;
  }

  let user =
    await findUserByEmail(
      USERS_TABLE,
      googleUser.email
    );

  /*
   * Existing account
   */
  if (user) {
    /*
     * Do not overwrite a password account.
     *
     * Instead, attach Google authentication
     * to the same account.
     */
    const sessionId =
      crypto.randomUUID();

    const updatedUser =
      await updateUserSession(
        USERS_TABLE,
        user.userId,
        sessionId
      );

    user =
      updatedUser || user;

    const token =
      generateToken({
        userId:
          user.userId,

        sessionId,
      });

    return {
      token,

      user:
        publicUser(user),
    };
  }

  /*
   * New Google account
   */
  const userId =
    crypto.randomUUID();

  const sessionId =
    crypto.randomUUID();

  user = {
    userId,

    name:
      googleUser.name,

    email:
      googleUser.email,

    authProvider:
      "google",

    googleId:
      googleUser.googleId,

    profilePicture:
      googleUser.picture,

    createdAt:
      new Date().toISOString(),

    activeSessionId:
      sessionId,

    sessionUpdatedAt:
      new Date().toISOString(),
  };

  await putItem(
    USERS_TABLE,
    user
  );

  const token =
    generateToken({
      userId,
      sessionId,
    });

  return {
    token,

    user:
      publicUser(user),
  };
};

module.exports = {
  getGoogleAuthorizationUrl,
  getGoogleRedirectUri,
  loginWithGoogle,
};