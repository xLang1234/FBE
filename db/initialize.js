const logger = require("../config/logger");
const { pool } = require("./connection");
const { createAuthTables } = require("./schemas/auth");
const { createSourcesTables } = require("./schemas/sources");
const { createContentTables } = require("./schemas/content");
const { createAlertsTables } = require("./schemas/alerts");
const { createPaymentsTables } = require("./schemas/payments");

// In the initializeDatabase function

const initializeDatabase = async () => {
  try {
    logger.info("Starting database initialization");

    await createAuthTables(pool);
    logger.info("Auth tables created");

    await createSourcesTables(pool);
    logger.info("Sources tables created");

    await createContentTables(pool);
    logger.info("Content tables created");

    await createAlertsTables(pool);
    logger.info("Alerts tables created");

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
