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

const createCryptoSentimentTable = async (pool) => {
  // Create crypto_sentiment table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS crypto_sentiment (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        value DECIMAL(5,2) NOT NULL,
        value_classification VARCHAR(20) NOT NULL,
        score DECIMAL(5,2) NOT NULL,
        trend VARCHAR(10) NOT NULL,
        UNIQUE(symbol, timestamp)
      )
    `);

  // Create index
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crypto_sentiment_symbol ON crypto_sentiment(symbol);
      CREATE INDEX IF NOT EXISTS idx_crypto_sentiment_timestamp ON crypto_sentiment(timestamp);
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
  createCryptoSentimentTable,
  createLastUpdateTable,
};
