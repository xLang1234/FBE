// db/index.js

const { pool, initializeDbConnection } = require("./connection");
const { initializeDatabase } = require("./initialize");

module.exports = {
  pool,
  initializeDatabase,
  initializeDbConnection,
};
