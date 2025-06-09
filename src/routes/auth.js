const app = require("express");
const router = app.Router();
const AuthController = require("../controllers/AuthController");
const authMiddleware = require("../middlewares/authMiddleware");
router.route("/sign-in").post(AuthController.signIn);
router.route("/sign-out").post(AuthController.signOut);
router.route("/forgot-password").post(AuthController.forgotPassword);
router.route("/reset-password/:token").post(AuthController.resetPassword);
router
  .route("/change-password")
  .post(authMiddleware.isAuthorized, AuthController.changePassword);
  router
  .route("/refresh-token")
  .post(AuthController.refreshToken);

module.exports = router;
