const moment = require("moment");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const db = require("../util/dbconnection.js");
const validation = require("../validation.js");
const cli = require("nodemon/lib/cli/index.js");

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
    console.log(req.body.email);
    var valid = validation.emailLoginValidation(req.body.email);

    var valid = {};

    if (valid.error) {
      return res.status(417).send("Invalid Email Format");
    }

    const user = await getUserByEmail(req.body.email);

    if (!user[0]) {
      return res.status(404).send("Invalid email or password");
    }

    const passwordValidation = await validatePassword(
      req.body.password,
      user[0]
    );

    if (!passwordValidation) {
      return res.status(404).send("Invalid email or password");
    }

    const token = await jwt.sign({ id: user[0].id }, process.env.AUTHTOKEN, {
      expiresIn: "15m",
    });

    res.cookie("Authorization", token, {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    });
    return res.status(201).send("Login Success");
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
  //   const user = await getUserById(user.id);
  console.log(user.password);
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
  console.log(result.rows);
  return result.rows;
}
