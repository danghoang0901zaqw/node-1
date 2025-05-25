const app = require("express");
const UserController = require("../controllers/UserController");
const router = app.Router();
router.route("/").get(UserController.index).post(UserController.create);
router
  .route("/:userId")
  .patch(UserController.update)
  .delete(UserController.destroy);
router.route("/forceDestroy/:userId").delete(UserController.forceDestroy);
module.exports = router;
