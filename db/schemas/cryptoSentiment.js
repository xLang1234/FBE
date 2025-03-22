// db/schemas/cryptoSentiment.js

/**
 * Creates the fear_and_greed_index table in PostgreSQL
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createFearAndGreedIndexTable = async (pool) => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS fear_and_greed_index (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        value INTEGER NOT NULL,
        value_classification VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(timestamp)
      )
    `);

  // Create index for faster queries by timestamp
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_fear_and_greed_index_timestamp ON fear_and_greed_index(timestamp)
    `);
};

const createLastUpdateTable = async (pool) => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS fear_and_greed_last_update (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(50) NOT NULL UNIQUE,
        last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        next_update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
};

module.exports = {
  createFearAndGreedIndexTable,
  createLastUpdateTable,
};
