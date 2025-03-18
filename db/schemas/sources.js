/**
 * Sources and entities tables
 */

const createSourcesTables = async (pool) => {
  // Create sources table
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

  // Create entities table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS entities (
        id SERIAL PRIMARY KEY,
        source_id INTEGER REFERENCES sources(id),
        entity_external_id VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL,
        username VARCHAR(100),
        description TEXT,
        followers_count INTEGER,
        relevance_score DECIMAL(5,2),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(source_id, entity_external_id)
      )
    `);

  // Create indexes
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_entities_source_id ON entities(source_id);
    `);
};

module.exports = {
  createSourcesTables,
};
