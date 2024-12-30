const router = require("express").Router();
const authController = require("../controllers/authController.js");
const db = require("../util/dbconnection.js");
const jwt = require("jsonwebtoken");
const verify = require("../verify.js");

router.post("/register", authController.registerNewUser);
router.post("/login", authController.loginUser);
router.get("/userData", verify, authController.getUserByToken);
router.post("/verify", async function (req, res) {
  var token = req.headers.cookie;
  console.log(token);
  token = token.replace("Authorization=", "");
  return res.send(jwt.verify(token, process.env.AUTHTOKEN));
});

module.exports = router;
