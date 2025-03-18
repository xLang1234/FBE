/**
 * Cryptocurrencies tables
 */

const createCryptoTables = async (pool) => {
  // Create cryptocurrencies table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS cryptocurrencies (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(symbol)
      )
    `);
};

const createFearAndGreedIndexTable = async (pool) => {
  // Create fear_and_greed_index table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS fear_and_greed_index (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        value DECIMAL(5,2) NOT NULL,
        value_classification VARCHAR(20) NOT NULL,
        UNIQUE(timestamp)
      )
    `);

  // Create index
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fear_and_greed_index_timestamp ON fear_and_greed_index(timestamp);
    `);
};

const createLastUpdateTable = async (pool) => {
  // Create last_update table for tracking API updates
  await pool.query(`
      CREATE TABLE IF NOT EXISTS last_update (
        id SERIAL PRIMARY KEY,
        update_type VARCHAR(50) NOT NULL UNIQUE,
        last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
        next_update TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);
};

module.exports = {
  createCryptoTables,
  createFearAndGreedIndexTable,
  createLastUpdateTable,
};
