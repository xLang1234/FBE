const logger = require("../config/logger");
const { pool } = require("./connection");
const { createAuthTables } = require("./schemas/auth");
const { createPaymentsTables } = require("./schemas/payments");
const { DATABASE } = require("../constants/logMessages");

const initializeDatabase = async () => {
  try {
    logger.info(DATABASE.INIT_START);

    await createAuthTables(pool);
    logger.info(DATABASE.AUTH_TABLES_CREATED);

    await createPaymentsTables(pool);
    logger.info(DATABASE.PAYMENTS_TABLES_CREATED);

    logger.info(DATABASE.INIT_COMPLETE);
    return true;
  } catch (error) {
    logger.error(DATABASE.INIT_FAILURE, error);
    throw error;
  }
};

module.exports = {
  initializeDatabase,
};
