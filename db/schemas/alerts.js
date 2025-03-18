/**
 * Alerts table
 */

const createAlertsTables = async (pool) => {
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

  // Create indexes
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_alerts_processed_content_id ON alerts(processed_content_id);
    `);
};

module.exports = {
  createAlertsTables,
};
