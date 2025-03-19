// db/schemas/feedback.js
const createFeedbackTable = async (pool) => {
  // Create feedback table
  await pool.query(`
          CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            feedback_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            rating INTEGER,
            source VARCHAR(100),
            status VARCHAR(20) DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

  // Create index for efficient querying
  await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
          CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
        `);
};

module.exports = {
  createFeedbackTable,
};
