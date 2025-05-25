const express = require("express");
const dotenv = require("dotenv");
const session = require("express-session");
const flash = require("connect-flash");

const route = require("./routes");

dotenv.config();
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: "be-nodejs",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(flash());
const db = require("./config/db");
db.connectDB();

const port = 5001;

route(app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
