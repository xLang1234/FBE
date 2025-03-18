/**
 * Price impacts and relations tables
 */

const createAnalyticsTables = async (pool) => {
  // Create content_crypto_relations table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS content_crypto_relations (
        id SERIAL PRIMARY KEY,
        processed_content_id INTEGER REFERENCES processed_content(id),
        cryptocurrency_id INTEGER REFERENCES cryptocurrencies(id),
        relevance_score DECIMAL(5,2),
        UNIQUE(processed_content_id, cryptocurrency_id)
      )
    `);

  // Create price_impacts table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS price_impacts (
        id SERIAL PRIMARY KEY,
        processed_content_id INTEGER REFERENCES processed_content(id),
        cryptocurrency_id INTEGER REFERENCES cryptocurrencies(id),
        price_before DECIMAL(20,8),
        price_after_1h DECIMAL(20,8),
        price_after_24h DECIMAL(20,8),
        volume_change_percent DECIMAL(10,2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

  // Create indexes
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_content_crypto_processed_content_id ON content_crypto_relations(processed_content_id);
      CREATE INDEX IF NOT EXISTS idx_content_crypto_cryptocurrency_id ON content_crypto_relations(cryptocurrency_id);
      CREATE INDEX IF NOT EXISTS idx_price_impacts_processed_content_id ON price_impacts(processed_content_id);
      CREATE INDEX IF NOT EXISTS idx_price_impacts_cryptocurrency_id ON price_impacts(cryptocurrency_id);
    `);
};

module.exports = {
  createAnalyticsTables,
};
