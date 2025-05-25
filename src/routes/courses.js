const app = require("express");
const CourseController = require("../controllers/CourseController");
const router = app.Router();
router.route("/").get(CourseController.index).post(CourseController.create);
router
  .route("/:courseId")
  .patch(CourseController.update)
  .delete(CourseController.destroy);
router.route("/forceDestroy/:courseId").delete(CourseController.forceDestroy);
module.exports = router;
