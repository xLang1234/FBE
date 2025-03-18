/**
 * Utility script to drop all tables from the database
 * USE WITH CAUTION: This will delete all data!
 */

const { pool } = require("./connection");
const logger = require("../config/logger");

const dropAllTables = async () => {
  const client = await pool.connect();

  try {
    logger.warn("⚠️ WARNING: Dropping all tables from database!");

    // Start a transaction
    await client.query("BEGIN");

    // Disable foreign key checks temporarily
    await client.query("SET CONSTRAINTS ALL DEFERRED");

    // Get all tables in the public schema
    const tablesResult = await client.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    `);

    const tables = tablesResult.rows.map((row) => row.tablename);

    if (tables.length === 0) {
      logger.info("No tables found to drop");
      await client.query("COMMIT");
      return {
        success: true,
        message: "No tables found to drop",
        tablesDropped: [],
      };
    }

    // Drop all tables in a single command
    logger.info(`Dropping ${tables.length} tables: ${tables.join(", ")}`);

    await client.query(`DROP TABLE IF EXISTS ${tables.join(", ")} CASCADE`);

    // Commit the transaction
    await client.query("COMMIT");

    logger.info("All tables dropped successfully");
    return {
      success: true,
      message: "All tables dropped successfully",
      tablesDropped: tables,
    };
  } catch (error) {
    // Rollback on error
    await client.query("ROLLBACK");
    logger.error("Error dropping tables:", error);
    return {
      success: false,
      message: "Failed to drop tables",
      error: error.message,
    };
  } finally {
    client.release();
  }
};

// Export the function for use in scripts or API endpoints
module.exports = { dropAllTables };

// Allow running directly from command line
if (require.main === module) {
  (async () => {
    try {
      const result = await dropAllTables();
      console.log(result);
      process.exit(0);
    } catch (error) {
      console.error("Failed to drop tables:", error);
      process.exit(1);
    } finally {
      // Close the pool
      await pool.end();
    }
  })();
}
