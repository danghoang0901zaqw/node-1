const coursesRouter = require("./courses");
const usersRouter = require("./users");
const authRouter = require("./auth");
const roleRouter = require("./role");
const permissionRouter = require("./permission");
const siteRouter = require("./sites");
const authMiddleware = require("../middlewares/authMiddleware");

function route(app) {
  app.use("/auth", authRouter);
  app.use("/users", authMiddleware.isAuthorized, usersRouter);
  app.use("/courses", authMiddleware.isAuthorized, coursesRouter);
  app.use("/roles", authMiddleware.isAuthorized, roleRouter);
  app.use("/permissions", authMiddleware.isAuthorized, permissionRouter);
  app.use("/", siteRouter);
}
module.exports = route;