const router = require("express").Router();

const redirectController = require("../controllers/redirectController");
const authController = require("../controllers/authController");

router.get("/", authController.redirect);

module.exports = router;
