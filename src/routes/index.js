const coursesRouter = require("./courses");
const usersRouter = require("./users");
const siteRouter = require("./sites");

function route(app) {
  app.use("/users", usersRouter)
  app.use("/courses", coursesRouter)
  app.use("/", siteRouter);
}
module.exports = route;