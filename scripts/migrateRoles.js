require("dotenv").config();
const { Pool } = require("pg");
const logger = require("../config/logger");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrateRoles() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO roles (name) 
      VALUES ('basic'), ('paid'), ('admin')
      ON CONFLICT (name) DO NOTHING
    `);

    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role_id'
    `);

    if (columnCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN role_id INTEGER REFERENCES roles(id) DEFAULT 1
      `);

      await client.query(`
        UPDATE users SET role_id = 1
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)
      `);
    }

    await client.query("COMMIT");

    logger.info("Role migration completed successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("Role migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}

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
