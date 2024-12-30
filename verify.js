const jwt = require("jsonwebtoken");

module.exports = async function (req, res, next) {
  try {
    console.log(req.headers);

    var token = req.Header.Cookie;

    console.log(token);

    if (!token) {
      return res.status(401).send("Access Denied");
    }

    token = token.replace("Authorization=", "");

    const verified = await jwt.verify(token, process.env.AUTHTOKEN);

    req.user = verified;
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).send(error.message);
  }
};
