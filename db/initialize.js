const logger = require("../config/logger");
const { pool } = require("./connection");
const { createAuthTables } = require("./schemas/auth");
const { createSourcesTables } = require("./schemas/sources");
const { createContentTables } = require("./schemas/content");
const { createCryptoTables } = require("./schemas/crypto");
const { createAnalyticsTables } = require("./schemas/analytics");
const { createAlertsTables } = require("./schemas/alerts");

const initializeDatabase = async () => {
  try {
    logger.info("Starting database initialization");

    await createAuthTables(pool);
    logger.info("Auth tables created");

    await createSourcesTables(pool);
    logger.info("Sources tables created");

    await createContentTables(pool);
    logger.info("Content tables created");

    await createCryptoTables(pool);
    logger.info("Crypto tables created");

    await createAnalyticsTables(pool);
    logger.info("Analytics tables created");

    await createAlertsTables(pool);
    logger.info("Alerts tables created");

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
