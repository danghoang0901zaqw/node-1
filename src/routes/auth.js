const app = require("express");
const router = app.Router();
const AuthController = require("../controllers/AuthController");
router.route("/sign-in").post(AuthController.signIn);
router.route("/sign-out").post(AuthController.signOut);
router.route("/forgot-password").post(AuthController.forgotPassword);
router.route("/change-password").post(AuthController.changePassword);

module.exports = router;
