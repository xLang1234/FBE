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
};

module.exports = {
  createAltcoinSeasonIndexTable,
};
