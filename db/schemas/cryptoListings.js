// db/schemas/cryptoListings.js
const logger = require("../../config/logger");
const { CRYPTO, ERROR } = require("../../constants/logMessages");

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

    await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_cryptocurrencies_symbol ON cryptocurrencies(symbol)
      `);

    return true;
  } catch (error) {
    console.error(CRYPTO.TABLE_CREATE_ERROR("cryptocurrencies"), error);
    throw error;
  }
};

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
    console.error(CRYPTO.TABLE_CREATE_ERROR("cryptocurrency_prices"), error);
    throw error;
  }
};

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
    console.error(CRYPTO.TABLE_CREATE_ERROR("cryptocurrency_tags"), error);
    throw error;
  }
};

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
      CRYPTO.TABLE_CREATE_ERROR("cryptocurrency_listings_last_update"),
      error
    );
    throw error;
  }
};

const initializeCryptoTables = async (pool) => {
  try {
    logger.info(CRYPTO.TABLES_DROP);
    await pool.query(`DROP TABLE IF EXISTS cryptocurrency_prices CASCADE`);
    await pool.query(`DROP TABLE IF EXISTS cryptocurrency_tags CASCADE`);
    await pool.query(
      `DROP TABLE IF EXISTS cryptocurrency_listings_last_update CASCADE`
    );
    await pool.query(`DROP TABLE IF EXISTS cryptocurrencies CASCADE`);

    logger.info(CRYPTO.TABLES_INIT_START);
    await createCryptocurrenciesTable(pool);

    logger.info(CRYPTO.TABLES_INIT_PRICES);
    await createCryptocurrencyPricesTable(pool);

    logger.info(CRYPTO.TABLES_INIT_TAGS);
    await createCryptocurrencyTagsTable(pool);

    logger.info(CRYPTO.TABLES_INIT_LAST_UPDATE);
    await createCryptoListingsLastUpdateTable(pool);

    logger.info(CRYPTO.TABLES_INIT_COMPLETE);
    return true;
  } catch (error) {
    console.error(CRYPTO.TABLES_INIT_FAILURE, error);
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
