const { Client } = require("@duosecurity/duo_universal");
const moment = require("moment");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const db = require("../util/dbconnection.js");
const validation = require("../validation.js");
const cli = require("nodemon/lib/cli/index.js");

const client = new Client({
  clientId: process.env.DUOCLIENTID,
  clientSecret: process.env.DUOCLIENTSECRET,
  apiHost: process.env.DUOAPIHOST,
  redirectUrl: "http://localhost:4000/redirect",
});

exports.registerNewUser = async function (req, res) {
  try {
    const valid = validation.registerValidation(req.body);

    if (valid.error) {
      console.log(valid.error);
      return res.status(401).send(valid.error);
    }
    const checkEmail = await getUserByEmail(req.body.email);

    if (checkEmail.length != 0) {
      return res.status(417).send("email has been registered");
    }

    let created_at = moment().valueOf();
    let updated_at = moment().valueOf();
    let hashPassword = await encryptPassword(req.body.password);
    let birth_date = moment(req.body.birth_date).valueOf();

    const client = await db.pool.connect();

    await client.query("BEGIN");

    const result = await client
      .query({
        text: "INSERT INTO users (first_name,last_name,email,password,mobile_phone, birth_date, user_levels,status,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
        values: [
          req.body.first_name,
          req.body.last_name,
          req.body.email,
          hashPassword,
          req.body.mobile_phone,
          birth_date,
          req.body.user_levels,
          req.body.status,
          created_at,
          updated_at,
        ],
      })
      .then(async (res) => {
        await client.query("COMMIT");
        const data = {
          status: 200,
          message: "success",
          result: res.rows,
        };
        console.log(res);
        return data;
      });

    return res.status(201).send(result);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error.message);
  }
};

exports.loginUser = async function (req, res) {
  try {
    var valid = await validation.emailLoginValidation(req.body);

    if (valid.error) {
      return res.status(417).send("Invalid Email or Password Format");
    }

    const user = await getUserByEmail(req.body.email);

    if (user.length === 0) {
      return res.status(401).send("Invalid email or password");
    }

    const passwordValidation = await validatePassword(
      req.body.password,
      user[0]
    );

    if (!passwordValidation) {
      return res.status(401).send("Invalid email or password");
    }

    const token = await jwt.sign({ id: user[0].id }, process.env.AUTHTOKEN);
    const refreshToken = await jwt.sign(
      { id: user[0].id },
      process.env.REFRESHTOKEN
    );

    await res.cookie("Authorization", token, {
      // secure: true,
      // sameSite: "none",
      httpOnly: true,
      // maxAge: 60 * 60 * 24 * 30,
    });

    await res.cookie("RefreshToken", refreshToken, {
      // secure: true,
      // sameSite: "none",
      httpOnly: true,
      // maxAge: 60 * 60 * 24 * 30,
    });

    return res.status(201).send("Login Success");
  } catch (error) {
    console.log(error);
    return res.status(500).send(error.message);
  }
};

exports.loginDuo = async function (req, res) {
  try {
    console.log(req.body);

    client.redirectUrl = req.body.redirect;
    const status = await client.healthCheck();

    console.log(status);

    const state = await client.generateState();

    console.log(state);

    const { email } = req.body;

    console.log(email);

    req.session.duo = { state, email };

    const authUrl = await client.createAuthUrl(email, state);

    console.log(authUrl);

    // const token = await client.exchangeAuthorizationCodeFor2FAResult(
    //   state,
    //   username
    // );
    //return res.redirect(authUrl, 302);
    req.session.username = email;
    req.session.state = state;
    return res.status(200).send(authUrl);

    console.log(token);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error.message);
  }
};

exports.redirect = async function (req, res) {
  const { query, session } = req;
  const { duo_code, state, username, url } = query;

  console.log("Query");
  console.log(req.query);
  console.log("Session");
  console.log(req.session);
  console.log(username);

  const token = await client.exchangeAuthorizationCodeFor2FAResult(
    duo_code,
    username
  );

  if (!duo_code || typeof duo_code !== "string") {
    return res.status(404).send("Missing 'duo_code' query parameters");
  }

  if (!state || typeof state !== "string") {
    return res.status(404).send("Missing 'state' query parameters");
  }

  const savedState = session.duo?.state;
  const savedUsername = session.duo?.username;
  console.log("TOKEN");
  console.log(token);

  if (token.auth_result.result === "allow") {
    const user = await getUserByEmail(username);
    const merchantId = await getMerchantIdByUserId(user[0].id);
    console.log(user);
    const authToken = await jwt.sign(
      { id: user[0].id, merchant_id: merchantId.merchant_id },
      process.env.AUTHTOKEN
    );

    // req.session.duoVerified = true;
    console.log(req.session);

    await res.cookie("jwt", authToken, {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 1000 * 60 * 30,
    });
    return res.redirect(process.env.LOGINREDIRECT);
  }
};

exports.validateToken = async function (req, res) {
  try {
    //check which token has JWT
    const jwtToken = req.cookies.jwt;

    if (!jwtToken) {
      const errorMessage = {
        status: 401,
        message: "Forbidden",
      };
      return res.status(200).send(errorMessage);
    }

    const verifyToken = await jwt.verify(
      jwtToken,
      process.env.AUTHTOKEN,
      (error, result) => {
        if (error) {
          console.log(error);

          const errorMessage = {
            status: 401,
            message: "Forbidden",
          };
          return res.status(200).send(errorMessage);
        }

        const successMessage = {
          status: 200,
          message: "Validated",
        };

        return res.status(successMessage.status).send(successMessage);
      }
    );
  } catch (error) {
    console.log(error.message);
    return res.status(500).send(error.message);
  }
};

exports.logOut = async function (req, res) {
  try {
    req.session.destroy(() => {
      res.clearCookie("jwt", {
        httpOnly: true,
        secure: true,
      });
      res.clearCookie("connect.sid");
      return res.status(200).send("Logged Out");
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).send(error.message);
  }
};

exports.getUserNameByToken = async function (req, res) {
  try {
    console.log(req);

    if (req.user) {
      const user = await getUserById(req.user.id);
      console.log(user);

      const first_name = user[0].first_name;
      const last_name = user[0].last_name;

      const data = {
        first_name: first_name,
        last_name: last_name,
      };
      return res.status(200).send(data);
    }
  } catch (error) {
    console.log(error.message);
    return res.status(500).send(error.message);
  }
};

async function encryptPassword(password) {
  const saltround = 10;
  return await bcrypt.hash(password, saltround);
}

async function validatePassword(password, user) {
  const encryptPassword = user.password;
  const result = await bcrypt.compare(password, encryptPassword);
  console.log(result);
  return result;
}

async function getUserById(userId) {
  const result = await db.pool.query({
    text: "SELECT * FROM users where id = $1",
    values: [userId],
  });

  return result.rows;
}

async function getUserByEmail(email) {
  const result = await db.pool.query({
    text: "SELECT * FROM users where LOWER(email) = $1",
    values: [email.toLowerCase()],
  });
  //console.log(result.rows);
  return result.rows;
}

async function getMerchantIdByUserId(userId) {
  const result = await db.pool.query({
    text: "SELECT merchant_id FROM merchant_users WHERE users_id = $1",
    values: [userId],
  });

  return result.rows[0];
}
