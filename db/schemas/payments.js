const createPaymentsTables = async (pool) => {
  // Create payments table
  await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        status TEXT NOT NULL,
        transaction_id TEXT,
        created_at TIMESTAMP NOT NULL
      )
    `);

  // Create index
  await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    `);
};

module.exports = {
  createPaymentsTables,
};
