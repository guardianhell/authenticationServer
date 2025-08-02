const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: process.env.DBHOST,
  database: process.env.DBNAME,
  password: process.env.DBPASSWORD,
  port: 5432,
});

module.exports = {
  pool,
};
