const createAltcoinSeasonIndexTable = async (pool) => {
  // Create altcoin_season_index table
  await pool.query(`
        CREATE TABLE IF NOT EXISTS altcoin_season_index (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
          altcoin_index DECIMAL(10,2) NOT NULL,
          altcoin_marketcap DECIMAL(20,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(timestamp)
        )
      `);

  // Create index for efficient querying
  await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_altcoin_season_index_timestamp ON altcoin_season_index(timestamp);
      `);

  // Create the last_update table for tracking update schedules
  await pool.query(`
        CREATE TABLE IF NOT EXISTS last_update (
          update_type VARCHAR(50) PRIMARY KEY,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          next_update TIMESTAMP WITH TIME ZONE NOT NULL
        )
      `);
};

module.exports = {
  createAltcoinSeasonIndexTable,
};
