/**
 * Authentication related tables: users, roles, and sessions
 */

const createAuthTables = async (pool) => {
  // Create roles table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Insert default roles
  await pool.query(`
    INSERT INTO roles (name) 
    VALUES ('basic'), ('paid'), ('admin')
    ON CONFLICT (name) DO NOTHING
  `);

  // Create users table with role_id field
  await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id TEXT UNIQUE,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        picture TEXT,
        role_id INTEGER REFERENCES roles(id) DEFAULT 1,
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
      CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);
};

module.exports = {
  createAuthTables,
};
