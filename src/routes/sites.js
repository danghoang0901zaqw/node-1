var express = require("express");
var router = express.Router();
const siteController = require("../controllers/SiteController");
router.use("/search", siteController.search);
router.use("/", siteController.index);
module.exports = router;
