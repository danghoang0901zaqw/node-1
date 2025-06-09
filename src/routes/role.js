const app = require("express");
const RoleController = require("../controllers/RoleController");
const router = app.Router();
router.route("/").get(RoleController.index).post(RoleController.create);
router
  .route("/:roleId")
  .patch(RoleController.update)
  .delete(RoleController.destroy);

module.exports = router;
