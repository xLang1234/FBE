const { Pool } = require("pg");
const logger = require("./logger");

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
  logger.info("Connected to PostgreSQL database: " + process.env.DB_NAME);
});

pool.on("error", (err) => {
  logger.error("PostgreSQL error:", err);
});

const initializeDbConnection = () => {
  pool.connect().catch((err) => {
    logger.error("Failed to connect to database:", err);
  });
};

module.exports = {
  pool,
  initializeDbConnection,
};
