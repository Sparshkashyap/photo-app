const {
  findUserById,
} = require("../services/dynamoService");

const USERS_TABLE =
  process.env.USERS_TABLE_NAME;

/*
 * ==================================================
 * PUBLIC USER
 * ==================================================
 *
 * Never expose passwordHash or internal session
 * information to the frontend.
 */
const publicUser = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  provider:
    user.lastLoginProvider ||
    user.authProvider ||
    "password",
});

/*
 * ==================================================
 * GET CURRENT USER
 * ==================================================
 *
 * GET /user/profile
 *
 * Authentication is already handled by
 * authMiddleware.
 *
 * IMPORTANT:
 * Users are stored in DynamoDB, not MongoDB.
 */
const getProfile = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message:
          "Authentication is required",
      });
    }

    if (!USERS_TABLE) {
      const error =
        new Error(
          "USERS_TABLE_NAME is not configured",
        );

      error.statusCode = 500;

      throw error;
    }

    const user =
      await findUserById(
        USERS_TABLE,
        req.user.userId,
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: "USER_NOT_FOUND",
        message:
          "User not found",
      });
    }

    return res.status(200).json({
      success: true,

      user:
        publicUser(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
};