const {
  verifyToken,
} = require("../utils/jwt");

const {
  findUserById,
} = require("../services/dynamoService");

const USERS_TABLE =
  process.env.USERS_TABLE_NAME;

const authMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message:
          "Authorization token is required",
      });
    }

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        code: "INVALID_TOKEN",
        message:
          "Invalid authorization format",
      });
    }

    const decoded =
      verifyToken(token);

    if (
      !decoded?.userId ||
      !decoded?.sessionId
    ) {
      return res.status(401).json({
        success: false,
        code: "INVALID_SESSION",
        message:
          "Invalid authentication session",
      });
    }

    const user =
      await findUserById(
        USERS_TABLE,
        decoded.userId
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        code: "USER_NOT_FOUND",
        message: "User no longer exists",
      });
    }

    if (
      !user.activeSessionId ||
      user.activeSessionId !==
        decoded.sessionId
    ) {
      return res.status(401).json({
        success: false,
        code: "SESSION_REPLACED",
        message:
          "Your account is logged in on another device. Please log out there before using this device.",
      });
    }

    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    if (
      error?.name ===
      "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        code: "TOKEN_EXPIRED",
        message:
          "Your session has expired. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      code: "INVALID_TOKEN",
      message:
        "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;