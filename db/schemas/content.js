/**
 * Raw and processed content tables
 */

const createContentTables = async (pool) => {
  // Create raw_content table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS raw_content (
        id SERIAL PRIMARY KEY,
        entity_id INTEGER REFERENCES entities(id),
        external_id VARCHAR(100) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        published_at TIMESTAMP WITH TIME ZONE NOT NULL,
        collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        engagement_metrics JSONB,
        raw_data JSONB,
        UNIQUE(entity_id, external_id)
      )
    `);

  // Create processed_content table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS processed_content (
        id SERIAL PRIMARY KEY,
        raw_content_id INTEGER REFERENCES raw_content(id),
        sentiment_score DECIMAL(5,2),
        impact_score DECIMAL(5,2),
        categories TEXT[],
        keywords TEXT[],
        entities_mentioned TEXT[],
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        summary TEXT
      )
    `);

  // Create indexes
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_raw_content_entity_id ON raw_content(entity_id);
      CREATE INDEX IF NOT EXISTS idx_processed_content_raw_content_id ON processed_content(raw_content_id);
    `);
};

module.exports = {
  createContentTables,
};
