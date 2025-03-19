const logger = require("../config/logger");
const { pool } = require("./connection");
const { createAuthTables } = require("./schemas/auth");
const { createPaymentsTables } = require("./schemas/payments");

// In the initializeDatabase function

const initializeDatabase = async () => {
  try {
    logger.info("Starting database initialization");

    await createAuthTables(pool);
    logger.info("Auth tables created");

    await createPaymentsTables(pool);
    logger.info("Payments tables created");

    logger.info("Database initialization completed successfully");
    return true;
  } catch (error) {
    logger.error("Database initialization failed:", error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
};
