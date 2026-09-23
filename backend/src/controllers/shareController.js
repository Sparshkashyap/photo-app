const {
  createShare,
  getSharedPhoto,
  revokeShare,
} = require("../services/shareService");

// ==================================================
// FRONTEND URL
// ==================================================

function getFrontendOrigin(req) {
  const configuredOrigin =
    process.env.FRONTEND_URL;

  if (
    configuredOrigin &&
    configuredOrigin.trim()
  ) {
    return configuredOrigin
      .trim()
      .replace(/\/+$/, "");
  }

  /*
   * Fallback.
   *
   * This fallback is mainly useful for local
   * development or when FRONTEND_URL has not
   * been configured yet.
   *
   * In production, FRONTEND_URL should point
   * to the deployed React frontend.
   */

  const forwardedProto =
    req.headers[
      "x-forwarded-proto"
    ] ||
    req.protocol;

  const forwardedHost =
    req.headers[
      "x-forwarded-host"
    ] ||
    req.get("host");

  return `${forwardedProto}://${forwardedHost}`;
}

// ==================================================
// CREATE SHARE LINK
// POST /share
// ==================================================

const createShareLink =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        photoId,
        expiresInDays,
      } =
        req.body || {};

      const share =
        await createShare({
          photoId,
          userId:
            req.user.userId,
          expiresInDays,
        });

      const frontendOrigin =
        getFrontendOrigin(req);

      const shareUrl =
        `${frontendOrigin}/share/${share.token}`;

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Share link created",

          ...share,

          shareUrl,
        });
    } catch (error) {
      console.error(
        "Create share link error:",
        error
      );

      next(error);
    }
  };

// ==================================================
// GET PUBLIC SHARE
// GET /share/:token
// ==================================================

const getPublicShare =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const sharedPhoto =
        await getSharedPhoto(
          req.params.token
        );

      return res
        .status(200)
        .json({
          success: true,
          photo:
            sharedPhoto,
        });
    } catch (error) {
      console.error(
        "Get public share error:",
        error
      );

      next(error);
    }
  };

// ==================================================
// REVOKE SHARE LINK
// DELETE /share/:token
// ==================================================

const revokeShareLink =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const result =
        await revokeShare({
          token:
            req.params.token,

          userId:
            req.user.userId,
        });

      return res
        .status(200)
        .json(result);
    } catch (error) {
      console.error(
        "Revoke share link error:",
        error
      );

      next(error);
    }
  };

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  createShareLink,
  getPublicShare,
  revokeShareLink,
};