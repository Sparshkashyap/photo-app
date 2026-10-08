const express =
  require("express");

const {
  signup,
  login,
  logout,
  forgotPassword,
  verifyResetOtp,
  resetPasswordController,
  googleLogin,
  googleCallback,
  forceLogoutOtherSessionController,
} = require("../controllers/authController");

const authMiddleware =
  require("../middleware/authMiddleware");

const router =
  express.Router();

/*
 * ==================================================
 * NORMAL AUTH
 * ==================================================
 */

router.post(
  "/signup",
  signup
);

router.post(
  "/login",
  login
);

router.post(
  "/logout",
  authMiddleware,
  logout
);

router.post(
  "/force-logout-other-session",
  forceLogoutOtherSessionController
);

router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);
router.post("/reset-password", resetPasswordController);

/*
 * ==================================================
 * GOOGLE OAUTH
 * ==================================================
 */

/*
 * Frontend sends user here:
 *
 * GET /auth/google
 *
 * Then backend redirects to Google.
 */
router.get(
  "/google",
  googleLogin
);

/*
 * Google redirects here:
 *
 * GET /auth/google/callback
 */
router.get(
  "/google/callback",
  googleCallback
);

module.exports = router;