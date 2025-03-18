// db/schemas/cryptoListings.js

/**
 * Creates the cryptocurrencies table in PostgreSQL
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createCryptocurrenciesTable = async (pool) => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cryptocurrencies (
          cmc_id INTEGER PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          symbol VARCHAR(20) NOT NULL,
          slug VARCHAR(100) NOT NULL,
          max_supply DOUBLE PRECISION,
          infinite_supply BOOLEAN,
          date_added TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

    // Create indices for faster queries
    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cryptocurrencies_symbol ON cryptocurrencies(symbol)
      `);

    return true;
  } catch (error) {
    console.error("Error creating cryptocurrencies table:", error);
    throw error;
  }
};

/**
 * Creates the cryptocurrency_prices table in PostgreSQL for time series data
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createCryptocurrencyPricesTable = async (pool) => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cryptocurrency_prices (
          id SERIAL PRIMARY KEY,
          cmc_id INTEGER NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          price_usd DOUBLE PRECISION,
          volume_24h DOUBLE PRECISION,
          volume_change_24h DOUBLE PRECISION,
          percent_change_1h DOUBLE PRECISION,
          percent_change_24h DOUBLE PRECISION,
          percent_change_7d DOUBLE PRECISION,
          market_cap DOUBLE PRECISION,
          market_cap_dominance DOUBLE PRECISION,
          fully_diluted_market_cap DOUBLE PRECISION,
          circulating_supply DOUBLE PRECISION,
          total_supply DOUBLE PRECISION,
          cmc_rank INTEGER,
          num_market_pairs INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(cmc_id, timestamp),
          FOREIGN KEY (cmc_id) REFERENCES cryptocurrencies(cmc_id) ON DELETE CASCADE
        )
      `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cryptocurrency_prices_cmc_id ON cryptocurrency_prices(cmc_id)
      `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cryptocurrency_prices_timestamp ON cryptocurrency_prices(timestamp)
      `);

    return true;
  } catch (error) {
    console.error("Error creating cryptocurrency_prices table:", error);
    throw error;
  }
};

/**
 * Creates the cryptocurrency_tags table in PostgreSQL
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createCryptocurrencyTagsTable = async (pool) => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cryptocurrency_tags (
          id SERIAL PRIMARY KEY,
          cmc_id INTEGER NOT NULL,
          tag VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(cmc_id, tag),
          FOREIGN KEY (cmc_id) REFERENCES cryptocurrencies(cmc_id) ON DELETE CASCADE
        )
      `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cryptocurrency_tags_cmc_id ON cryptocurrency_tags(cmc_id)
      `);

    return true;
  } catch (error) {
    console.error("Error creating cryptocurrency_tags table:", error);
    throw error;
  }
};

/**
 * Creates the cryptocurrency_listings_last_update table to track the last API call
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createCryptoListingsLastUpdateTable = async (pool) => {
  try {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cryptocurrency_listings_last_update (
          id SERIAL PRIMARY KEY,
          endpoint VARCHAR(50) NOT NULL UNIQUE,
          last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          next_update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

    return true;
  } catch (error) {
    console.error(
      "Error creating cryptocurrency_listings_last_update table:",
      error
    );
    throw error;
  }
};

/**
 * Initialize all cryptocurrency tables in the correct order
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when all tables are created
 */
const initializeCryptoTables = async (pool) => {
  try {
    const logger = require("../../config/logger");

    // Drop tables if clean initialization is needed
    logger.info("Dropping existing cryptocurrency tables");
    await pool.query(`DROP TABLE IF EXISTS cryptocurrency_prices CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS cryptocurrency_tags CASCADE`);
    await pool.query(
      `DROP TABLE IF EXISTS cryptocurrency_listings_last_update CASCADE`
    );
    await pool.query(`DROP TABLE IF EXISTS cryptocurrencies CASCADE`);

    // Create tables in the correct order
    logger.info("Creating cryptocurrencies table");
    await createCryptocurrenciesTable(pool);

    logger.info("Creating cryptocurrency_prices table");
    await createCryptocurrencyPricesTable(pool);

    logger.info("Creating cryptocurrency_tags table");
    await createCryptocurrencyTagsTable(pool);

    logger.info("Creating cryptocurrency_listings_last_update table");
    await createCryptoListingsLastUpdateTable(pool);

    logger.info("All cryptocurrency tables created successfully");
    return true;
  } catch (error) {
    console.error("Error initializing crypto tables:", error);
    throw error;
  }
};

module.exports = {
  createCryptocurrenciesTable,
  createCryptocurrencyPricesTable,
  createCryptocurrencyTagsTable,
  createCryptoListingsLastUpdateTable,
  initializeCryptoTables,
};
