const express =
  require("express");

const {
  signup,
  login,
  logout,
  googleLogin,
  googleCallback,
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