require("dotenv").config();

const express = require("express");
const pg = require("pg");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");

const port = process.env.PORT || "5050";

const corsConfig = {
  credentials: true,
  origin: true,
};

const authRoute = require("./routes/authRoute.js");
const redirectRoute = require("./routes/redirectRoute.js");

const app = express();

app.use(express.static("public"));
app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    secret: process.env.SESSIONSECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.urlencoded({ limit: "2mb", extended: true }));
app.use(function (req, res, next) {
  res.header("Content-Type", "application/json;charset=UTF-8");
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(cookieParser());
app.use(cors(corsConfig));

app.use("/api-v1/auth", authRoute);
app.use("/redirect", redirectRoute);

app.listen(port, function () {
  console.log("Server started on port " + port);
});
