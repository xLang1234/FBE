// db/connection.js

const { Pool } = require("pg");
const logger = require("../config/logger");
const { SERVER } = require("../constants/logMessages");

// Initialize PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Log database connection
pool.on("connect", () => {
  logger.info(SERVER.DB_CONNECTED(process.env.DB_NAME));
});

pool.on("error", (err) => {
  logger.error(SERVER.DB_CONNECTION_ERROR, err);
});

const initializeDbConnection = () => {
  pool.connect().catch((err) => {
    logger.error(SERVER.DB_CONNECTION_FAILED, err);
  });
};

module.exports = {
  pool,
  initializeDbConnection,
};
