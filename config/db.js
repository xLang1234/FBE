const { Pool } = require("pg");
const logger = require("./logger");

// Initialize PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Log database connection
pool.on("connect", () => {
  logger.info("Connected to PostgreSQL database: " + process.env.DB_NAME);
});

pool.on("error", (err) => {
  logger.error("PostgreSQL error:", err);
});

const initializeDatabase = async () => {
  // Create users table with username and password_hash fields
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      google_id TEXT UNIQUE,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      picture TEXT,
      created_at TIMESTAMP NOT NULL,
      last_login TIMESTAMP NOT NULL
    )
  `);

  // Create sessions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL
    )
  `);

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

  // Create alerts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id SERIAL PRIMARY KEY,
      processed_content_id INTEGER REFERENCES processed_content(id),
      alert_level VARCHAR(20) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);

  // Create indexes for existing tables
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  // Create indexes for new tables
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_entities_source_id ON entities(source_id);
    CREATE INDEX IF NOT EXISTS idx_raw_content_entity_id ON raw_content(entity_id);
    CREATE INDEX IF NOT EXISTS idx_processed_content_raw_content_id ON processed_content(raw_content_id);
    CREATE INDEX IF NOT EXISTS idx_content_crypto_processed_content_id ON content_crypto_relations(processed_content_id);
    CREATE INDEX IF NOT EXISTS idx_content_crypto_cryptocurrency_id ON content_crypto_relations(cryptocurrency_id);
    CREATE INDEX IF NOT EXISTS idx_price_impacts_processed_content_id ON price_impacts(processed_content_id);
    CREATE INDEX IF NOT EXISTS idx_price_impacts_cryptocurrency_id ON price_impacts(cryptocurrency_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_processed_content_id ON alerts(processed_content_id);
  `);
};

const initializeDbConnection = () => {
  pool.connect().catch((err) => {
    logger.error("Failed to connect to database:", err);
  });
};

module.exports = {
  pool,
  initializeDatabase,
  initializeDbConnection,
};
