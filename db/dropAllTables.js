/**
 * Utility script to drop all tables from the database
 * USE WITH CAUTION: This will delete all data!
 */

const { pool } = require("./connection");
const logger = require("../config/logger");
const { DATABASE } = require("../constants/logMessages");

const dropAllTables = async () => {
  const client = await pool.connect();

  try {
    logger.warn(DATABASE.DROP_TABLES_WARNING);

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
      logger.info(DATABASE.NO_TABLES_TO_DROP);
      await client.query("COMMIT");
      return {
        success: true,
        message: DATABASE.NO_TABLES_TO_DROP,
        tablesDropped: [],
      };
    }

    // Drop all tables in a single command
    logger.info(DATABASE.DROPPING_TABLES(tables.length, tables.join(", ")));

    await client.query(`DROP TABLE IF EXISTS ${tables.join(", ")} CASCADE`);

    // Commit the transaction
    await client.query("COMMIT");

    logger.info(DATABASE.DROP_TABLES_SUCCESS);
    return {
      success: true,
      message: DATABASE.DROP_TABLES_SUCCESS,
      tablesDropped: tables,
    };
  } catch (error) {
    // Rollback on error
    await client.query("ROLLBACK");
    logger.error(DATABASE.DROP_TABLES_ERROR, error);
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
      console.error(DATABASE.DROP_TABLES_ERROR, error);
      process.exit(1);
    } finally {
      // Close the pool
      await pool.end();
    }
  })();
}
