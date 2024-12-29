const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "pandoorbox",
  password: "!V1nzt3r91",
  port: 5432,
});

module.exports = {
  pool,
};
