const logger = require("../config/logger");
const { pool } = require("./connection");
const { DATABASE } = require("../constants/logMessages");

const { createAuthTables } = require("./schemas/auth");
const { createPaymentsTables } = require("./schemas/payments");
const {
  createFearAndGreedIndexTable,
  createLastUpdateTable,
} = require("./schemas/cryptoSentiment");
const { createAltcoinSeasonIndexTable } = require("./schemas/altcoinSeason");
const { initializeCryptoTables } = require("./schemas/cryptoListings");
const { createContentModelsTable } = require("./schemas/contentModels");
const { createFeedbackTable } = require("./schemas/feedback");

const initializeDatabase = async () => {
  const client = await pool.connect();

  try {
    logger.info(DATABASE.INIT_START);

    await client.query("BEGIN");

    await createAuthTables(client);

    await createPaymentsTables(client);
    await createContentModelsTable(client);

    await createFearAndGreedIndexTable(client);
    await createLastUpdateTable(client);

    await createAltcoinSeasonIndexTable(client);
    await initializeCryptoTables(client);

    await createFeedbackTable(client);

    await client.query("COMMIT");

    logger.info(DATABASE.INIT_COMPLETE);
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error(DATABASE.INIT_FAILURE, error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  initializeDatabase,
};
