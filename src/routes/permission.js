const app = require("express");
const PermissionController = require("../controllers/PermissionController");
const router = app.Router();
router
  .route("/")
  .get(PermissionController.index)
  .post(PermissionController.create);
router
  .route("/:permissionId")
  .patch(PermissionController.update)
  .delete(PermissionController.destroy);

module.exports = router;
