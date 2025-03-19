// scripts/migrateRoles.js
require("dotenv").config();
const { Pool } = require("pg");
const logger = require("../config/logger");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateRoles() {
  const client = await pool.connect();

  try {
    // Start transaction
    await client.query("BEGIN");

    // Create roles table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default roles
    await client.query(`
      INSERT INTO roles (name) 
      VALUES ('basic'), ('paid'), ('admin')
      ON CONFLICT (name) DO NOTHING
    `);

    // Check if role_id column exists in users table
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_id'
    `);

    if (columnCheck.rows.length === 0) {
      // Add role_id column to users table with default value of 1 (basic)
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN role_id INTEGER REFERENCES roles(id) DEFAULT 1
      `);

      // Set all existing users to basic role (id = 1)
      await client.query(`
        UPDATE users SET role_id = 1
      `);

      // Create index on role_id
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)
      `);
    }

    // Commit transaction
    await client.query("COMMIT");

    logger.info("Role migration completed successfully");
  } catch (err) {
    // Rollback transaction on error
    await client.query("ROLLBACK");
    logger.error("Role migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateRoles()
    .then(() => {
      console.log("Role migration completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration error:", err);
      process.exit(1);
    });
}

module.exports = { migrateRoles };
