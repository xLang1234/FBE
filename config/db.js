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

// Initialize database schema
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

  // Create indexes
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
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
