const {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
} = require("../services/authService");

const {
  OAuth2Client,
} = require("google-auth-library");

const crypto = require("crypto");

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
  `${frontendUrl.replace(/\/+$/, "")}/login`,
  `${frontendUrl.replace(/\/+$/, "")}/dashboard`,

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
 *
 * This page is shown briefly after Google authentication
 * and before redirecting the user to the frontend dashboard.
 */
const sendGoogleSuccessPage = (
  res,
  redirectUrl
) => {
  const faviconSvg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
    >
      <rect
        width="64"
        height="64"
        rx="16"
        fill="#7c3aed"
      />

      <g
        fill="#ffffff"
      >
        <rect
          x="30"
          y="8"
          width="4"
          height="18"
          rx="2"
        />

        <rect
          x="30"
          y="8"
          width="4"
          height="18"
          rx="2"
          transform="rotate(60 32 32)"
        />

        <rect
          x="30"
          y="8"
          width="4"
          height="18"
          rx="2"
          transform="rotate(120 32 32)"
        />

        <rect
          x="30"
          y="8"
          width="4"
          height="18"
          rx="2"
          transform="rotate(180 32 32)"
        />

        <rect
          x="30"
          y="8"
          width="4"
          height="18"
          rx="2"
          transform="rotate(240 32 32)"
        />

        <rect
          x="30"
          y="8"
          width="4"
          height="18"
          rx="2"
          transform="rotate(300 32 32)"
        />

        <circle
          cx="32"
          cy="32"
          r="7"
        />
      </g>
    </svg>
  `;

  const faviconDataUri =
    `data:image/svg+xml,${encodeURIComponent(
      faviconSvg
    )}`;

  /*
   * JSON.stringify safely places the redirect URL
   * inside the JavaScript block.
   */
  const safeRedirectUrl =
    JSON.stringify(
      redirectUrl
    );

  return res
    .status(200)
    .type("html")
    .send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>
    Welcome to Photo-App
  </title>

  <link
    rel="icon"
    type="image/svg+xml"
    href="${faviconDataUri}"
  />

  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100%;
    }

    body {
      min-height: 100vh;

      display: flex;
      align-items: center;
      justify-content: center;

      background:
        radial-gradient(
          circle at 50% 0%,
          #1e293b 0%,
          #0f172a 42%,
          #020617 100%
        );

      color: #ffffff;

      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    .card {
      width: min(
        calc(100% - 40px),
        440px
      );

      padding: 44px 32px;

      text-align: center;

      border: 1px solid
        rgba(255, 255, 255, 0.1);

      border-radius: 24px;

      background:
        rgba(15, 23, 42, 0.86);

      box-shadow:
        0 25px 80px
        rgba(0, 0, 0, 0.5);

      backdrop-filter:
        blur(18px);
    }

    .logo {
      width: 76px;
      height: 76px;

      margin: 0 auto 24px;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 20px;

      background:
        #7c3aed;

      box-shadow:
        0 14px 40px
        rgba(124, 58, 237, 0.35);
    }

    .logo svg {
      width: 46px;
      height: 46px;
    }

    h1 {
      margin: 0 0 10px;

      font-size: 28px;

      line-height: 1.2;

      font-weight: 700;

      letter-spacing: -0.02em;
    }

    .subtitle {
      margin: 0;

      color: #cbd5e1;

      font-size: 15px;

      line-height: 1.6;
    }

    .success {
      margin-top: 16px;

      color: #a7f3d0;

      font-size: 14px;

      font-weight: 500;
    }

    .loader {
      width: 26px;
      height: 26px;

      margin: 24px auto 0;

      border:
        3px solid
        rgba(255, 255, 255, 0.18);

      border-top-color:
        #ffffff;

      border-radius: 50%;

      animation:
        spin 0.8s linear infinite;
    }

    .brand {
      margin-top: 28px;

      color: #64748b;

      font-size: 12px;

      letter-spacing: 0.04em;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  </style>
</head>

<body>
  <main class="card">

    <div class="logo">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <g fill="white">

          <rect
            x="11"
            y="2.75"
            width="2"
            height="6.5"
            rx="1"
          />

          <rect
            x="11"
            y="2.75"
            width="2"
            height="6.5"
            rx="1"
            transform="rotate(60 12 12)"
          />

          <rect
            x="11"
            y="2.75"
            width="2"
            height="6.5"
            rx="1"
            transform="rotate(120 12 12)"
          />

          <rect
            x="11"
            y="2.75"
            width="2"
            height="6.5"
            rx="1"
            transform="rotate(180 12 12)"
          />

          <rect
            x="11"
            y="2.75"
            width="2"
            height="6.5"
            rx="1"
            transform="rotate(240 12 12)"
          />

          <rect
            x="11"
            y="2.75"
            width="2"
            height="6.5"
            rx="1"
            transform="rotate(300 12 12)"
          />

          <circle
            cx="12"
            cy="12"
            r="2.6"
          />

        </g>
      </svg>
    </div>

    <h1>
      Welcome to Photo-App
    </h1>

    <p class="subtitle">
      Your Google account has been
      authenticated successfully.
    </p>

    <p class="success">
      Redirecting to your dashboard...
    </p>

    <div
      class="loader"
      aria-label="Loading"
    ></div>

    <div class="brand">
      PHOTO-APP
    </div>

  </main>

  <script>
    const redirectUrl =
      ${safeRedirectUrl};

    setTimeout(() => {
      window.location.replace(
        redirectUrl
      );
    }, 1200);
  </script>
</body>
</html>
  `);
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
        crypto
          .randomBytes(24)
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

        prompt:
          "select_account",

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

    /*
     * Show branded Photo-App success
     * page before redirecting to dashboard.
     */
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

      token:
        result.token,

      user:
        result.user,
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

    if (
      !email ||
      !password
    ) {
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

      token:
        result.token,

      user:
        result.user,
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