// db/schemas/cryptoSentiment.js

/**
 * Creates the crypto_sentiment table in PostgreSQL
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createCryptoSentimentTable = async (pool) => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS crypto_sentiment (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL UNIQUE,
        value INTEGER NOT NULL,
        value_classification VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

  // Create index for faster queries by timestamp
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crypto_sentiment_timestamp ON crypto_sentiment(timestamp)
    `);
};

/**
 * Creates the crypto_sentiment_last_update table to track the last API call
 * @param {Object} pool - PostgreSQL connection pool
 * @returns {Promise} - Resolves when table is created
 */
const createLastUpdateTable = async (pool) => {
  await pool.query(`
      CREATE TABLE IF NOT EXISTS crypto_sentiment_last_update (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(50) NOT NULL UNIQUE,
        last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        next_update_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
};

module.exports = {
  createCryptoSentimentTable,
  createLastUpdateTable,
};
