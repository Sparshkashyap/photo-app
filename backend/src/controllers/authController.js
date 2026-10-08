const {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  forceLogoutActiveSession,
} = require("../services/authService");

const {
  requestPasswordReset,
  verifyPasswordResetOtp,
  resetPassword,
} = require("../services/passwordResetService");

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

  const normalizedFrontendUrl = frontendUrl.replace(/\/+$/, "");

  const allowedUris = [
    `${normalizedFrontendUrl}/login`,
    `${normalizedFrontendUrl}/dashboard`,
    "http://localhost:8080/login",
    "http://localhost:8080/dashboard",
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
 * Photo-App OAuth success page.
 * Shows briefly after Google authentication, then opens the dashboard.
 */
const sendGoogleSuccessPage = (res, redirectUrl) => {
  const safeRedirectUrl = JSON.stringify(redirectUrl);

  return res.status(200).type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Photo-App</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 42%, #020617 100%);
      color: #fff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .card {
      width: min(calc(100% - 40px), 440px);
      padding: 44px 32px;
      text-align: center;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 24px;
      background: rgba(15,23,42,.86);
      box-shadow: 0 25px 80px rgba(0,0,0,.5);
      backdrop-filter: blur(18px);
    }
    .logo {
      width: 76px; height: 76px; margin: 0 auto 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 20px; background: #7c3aed;
      box-shadow: 0 14px 40px rgba(124,58,237,.35);
    }
    .logo svg { width: 46px; height: 46px; }
    h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.2; font-weight: 700; }
    .subtitle { margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.6; }
    .success { margin-top: 16px; color: #a7f3d0; font-size: 14px; font-weight: 500; }
    .loader {
      width: 26px; height: 26px; margin: 24px auto 0;
      border: 3px solid rgba(255,255,255,.18);
      border-top-color: #fff; border-radius: 50%;
      animation: spin .8s linear infinite;
    }
    .brand { margin-top: 28px; color: #64748b; font-size: 12px; letter-spacing: .04em; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <main class="card">
    <div class="logo">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <g fill="white">
          <rect x="11" y="2.75" width="2" height="6.5" rx="1" />
          <rect x="11" y="2.75" width="2" height="6.5" rx="1" transform="rotate(60 12 12)" />
          <rect x="11" y="2.75" width="2" height="6.5" rx="1" transform="rotate(120 12 12)" />
          <rect x="11" y="2.75" width="2" height="6.5" rx="1" transform="rotate(180 12 12)" />
          <rect x="11" y="2.75" width="2" height="6.5" rx="1" transform="rotate(240 12 12)" />
          <rect x="11" y="2.75" width="2" height="6.5" rx="1" transform="rotate(300 12 12)" />
          <circle cx="12" cy="12" r="2.6" />
        </g>
      </svg>
    </div>
    <h1>Welcome to Photo-App</h1>
    <p class="subtitle">Your Google account has been authenticated successfully.</p>
    <p class="success">Redirecting to your dashboard...</p>
    <div class="loader" aria-label="Loading"></div>
    <div class="brand">PHOTO-APP</div>
  </main>
  <script>
    const redirectUrl = ${safeRedirectUrl};
    setTimeout(() => window.location.replace(redirectUrl), 1200);
  </script>
</body>
</html>`);
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

      forceSession:
        req.query.forceSession === "1",
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

        forceSession:
          Boolean(stateData?.forceSession),
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

    return sendGoogleSuccessPage(
      res,
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
      (error?.code ===
        "ACTIVE_SESSION" ||
        error?.code === "ACTIVE_SESSION_EXISTS")
    ) {
      const errorUrl =
        new URL(
          redirectUri
        );

      errorUrl.searchParams.set(
        "error",
        "ACTIVE_SESSION_EXISTS"
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

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const result = await requestPasswordReset(email);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const verifyResetOtp = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const otp = String(req.body?.otp || "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Enter the 6-digit verification code",
      });
    }

    await verifyPasswordResetOtp(email, otp);

    return res.status(200).json({
      success: true,
      message: "Verification code is valid",
    });
  } catch (error) {
    const responseError = new Error(error?.message || "Invalid or expired verification code");
    responseError.statusCode = 400;
    next(responseError);
  }
};

const resetPasswordController = async (req, res, next) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const otp = String(req.body?.otp || "").trim();
    const password = String(req.body?.password || "");

    if (!email || !/^\d{6}$/.test(otp) || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Email, valid verification code and a password of at least 8 characters are required",
      });
    }

    const result = await resetPassword({ email, otp, password });

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in again.",
      userId: result.userId,
    });
  } catch (error) {
    const responseError = new Error(error?.message || "Unable to reset password");
    responseError.statusCode = 400;
    next(responseError);
  }
};

const forceLogout = async (
  req,
  res,
  next
) => {
  try {
    const {
      email,
      password,
    } = req.body || {};

    const normalizedEmail =
      String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Verify the credentials first. Only the account owner can
    // invalidate the currently active session.
    await loginUser({
      email: normalizedEmail,
      password,
    }).catch(async (error) => {
      if (error?.code !== "ACTIVE_SESSION_EXISTS") {
        throw error;
      }
    });

    const userResult = await require("../services/dynamoService").findUserByEmail(
      process.env.USERS_TABLE_NAME,
      normalizedEmail
    );

    if (!userResult) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    await forceLogoutActiveSession({
      userId: userResult.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Other active session has been logged out. You can log in now.",
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

  forceLogout,

  forgotPassword,

  verifyResetOtp,

  resetPasswordController,

  googleLogin,

  googleCallback,
};