const createContentModelsTable = async (pool) => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(50) NOT NULL,
      api_endpoint VARCHAR(255),
      credentials_id VARCHAR(100),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS entities (
      id SERIAL PRIMARY KEY,
      source_id INTEGER REFERENCES sources(id) ON DELETE CASCADE,
      entity_external_id VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(100),
      description TEXT,
      followers_count INTEGER,
      relevance_score FLOAT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS raw_content (
      id SERIAL PRIMARY KEY,
      entity_id INTEGER REFERENCES entities(id) ON DELETE CASCADE,
      external_id VARCHAR(100) NOT NULL,
      content_type VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      published_at TIMESTAMP WITH TIME ZONE NOT NULL,
      collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      engagement_metrics JSONB,
      language VARCHAR(100),
      raw_data JSONB
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS processed_content (
      id SERIAL PRIMARY KEY,
      raw_content_id INTEGER REFERENCES raw_content(id) ON DELETE CASCADE,
      sentiment_score FLOAT,
      impact_score FLOAT,
      categories TEXT[],
      keywords TEXT[],
      entities_mentioned TEXT[],
      processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      summary TEXT
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_entities_source_id ON entities(source_id);
    CREATE INDEX IF NOT EXISTS idx_raw_content_entity_id ON raw_content(entity_id);
    CREATE INDEX IF NOT EXISTS idx_processed_content_raw_content_id ON processed_content(raw_content_id);
    CREATE INDEX IF NOT EXISTS idx_raw_content_external_id ON raw_content(external_id);
    CREATE INDEX IF NOT EXISTS idx_entities_external_id ON entities(entity_external_id);
    CREATE INDEX IF NOT EXISTS idx_raw_content_published_at ON raw_content(published_at);
  `);

  await pool.query(`
          CREATE TABLE IF NOT EXISTS telegram_publishing_tracking (
            id SERIAL PRIMARY KEY,
            last_published_id INTEGER NOT NULL DEFAULT 0,
            last_check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          INSERT INTO telegram_publishing_tracking (last_published_id, last_check_time) 
          VALUES (0, NOW());
        `);
};

module.exports = {
  createContentModelsTable,
};
