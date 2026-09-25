const {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
} = require("../services/authService");

const {
  OAuth2Client,
} = require("google-auth-library");

const crypto =
  require("crypto");

/*
 * Allowed frontend redirect.
 *
 * This prevents an arbitrary website from being
 * supplied as redirectUri.
 */
const getAllowedRedirectUri = (
  redirectUri
) => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    "http://localhost:8080";

  const allowedUris = [
    `${frontendUrl.replace(
      /\/+$/,
      ""
    )}/login`,

    "http://localhost:8080/login",
  ];

  if (
    redirectUri &&
    allowedUris.includes(
      redirectUri
    )
  ) {
    return redirectUri;
  }

  return `${frontendUrl.replace(
    /\/+$/,
    ""
  )}/login`;
};

/*
 * Build Google OAuth client.
 */
const getGoogleClient = () => {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET
  ) {
    const error = new Error(
      "Google OAuth configuration is missing"
    );

    error.statusCode = 500;

    throw error;
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    "https://y181ertste.execute-api.ap-south-1.amazonaws.com/auth/google/callback";

  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
};

/*
 * GET /auth/google
 *
 * Redirect user to Google.
 */
const googleLogin = async (
  req,
  res,
  next
) => {
  try {
    const {
      deviceId,
      redirectUri,
    } = req.query;

    const frontendRedirect =
      getAllowedRedirectUri(
        redirectUri
      );

    const client =
      getGoogleClient();

    /*
     * State contains the frontend redirect.
     *
     * Random nonce makes the state unpredictable.
     */
    const statePayload = {
      nonce:
        crypto.randomBytes(24)
          .toString("hex"),

      deviceId:
        typeof deviceId === "string"
          ? deviceId
          : undefined,

      redirectUri:
        frontendRedirect,
    };

    const state =
      Buffer.from(
        JSON.stringify(
          statePayload
        )
      ).toString("base64url");

    const authorizationUrl =
      client.generateAuthUrl({
        access_type: "offline",

        scope: [
          "openid",
          "email",
          "profile",
        ],

        prompt: "select_account",

        state,
      });

    return res.redirect(
      authorizationUrl
    );
  } catch (error) {
    next(error);
  }
};

/*
 * GET /auth/google/callback
 *
 * Google redirects here after authentication.
 */
const googleCallback = async (
  req,
  res,
  next
) => {
  let redirectUri =
    getAllowedRedirectUri();

  try {
    const {
      code,
      state,
      error: googleError,
    } = req.query;

    /*
     * User cancelled Google login.
     */
    if (googleError) {
      return res.redirect(
        `${redirectUri}?error=google_login_cancelled`
      );
    }

    if (
      typeof code !== "string" ||
      !code
    ) {
      return res.redirect(
        `${redirectUri}?error=google_authorization_failed`
      );
    }

    /*
     * Decode state.
     */
    let stateData = null;

    if (
      typeof state === "string"
    ) {
      try {
        stateData =
          JSON.parse(
            Buffer.from(
              state,
              "base64url"
            ).toString("utf8")
          );

        if (
          stateData?.redirectUri
        ) {
          redirectUri =
            getAllowedRedirectUri(
              stateData.redirectUri
            );
        }
      } catch {
        return res.redirect(
          `${redirectUri}?error=invalid_oauth_state`
        );
      }
    }

    const client =
      getGoogleClient();

    /*
     * Exchange authorization code
     * for Google tokens.
     */
    const {
      tokens,
    } =
      await client.getToken(
        code
      );

    if (!tokens.id_token) {
      return res.redirect(
        `${redirectUri}?error=google_token_missing`
      );
    }

    /*
     * Verify Google ID token and
     * create/reuse application user.
     */
    const result =
      await loginWithGoogle({
        idToken:
          tokens.id_token,
      });

    /*
     * Send JWT to frontend.
     *
     * Frontend's useAuth.tsx already reads
     * ?token=...
     */
    const frontendUrl =
      new URL(
        redirectUri
      );

    frontendUrl.searchParams.set(
      "token",
      result.token
    );

    return res.redirect(
      frontendUrl.toString()
    );
  } catch (error) {
    console.error(
      "Google OAuth callback error:",
      error
    );

    /*
     * Active session should be shown
     * to the frontend.
     */
    if (
      error?.code ===
      "ACTIVE_SESSION"
    ) {
      const errorUrl =
        new URL(
          redirectUri
        );

      errorUrl.searchParams.set(
        "error",
        "ACTIVE_SESSION"
      );

      errorUrl.searchParams.set(
        "message",
        error.message
      );

      return res.redirect(
        errorUrl.toString()
      );
    }

    const errorUrl =
      new URL(
        redirectUri
      );

    errorUrl.searchParams.set(
      "error",
      "GOOGLE_LOGIN_FAILED"
    );

    return res.redirect(
      errorUrl.toString()
    );
  }
};

const signup = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      email,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Name, email and password are required",
      });
    }

    const result =
      await registerUser({
        name,
        email,
        password,
      });

    return res.status(201).json({
      success: true,

      message:
        "Signup successful",

      token: result.token,

      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

const login = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,

        message:
          "Email and password are required",
      });
    }

    const result =
      await loginUser({
        email,
        password,
      });

    return res.status(200).json({
      success: true,

      message:
        "Login successful",

      token: result.token,

      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (
  req,
  res,
  next
) => {
  try {
    await logoutUser({
      userId:
        req.user.userId,

      sessionId:
        req.user.sessionId,
    });

    return res.status(200).json({
      success: true,

      message:
        "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signup,

  login,

  logout,

  googleLogin,

  googleCallback,
};