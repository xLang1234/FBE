const crypto = require("crypto");
const { pool } = require("../config/db");

// Helper function to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Helper function to create a session
const createSession = async (userId) => {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await pool.query(
    "INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, NOW())",
    [userId, sessionToken, expiresAt]
  );

  return sessionToken;
};

// Helper function to invalidate a session
const invalidateSession = async (sessionToken) => {
  if (!sessionToken) return;

  await pool.query("DELETE FROM sessions WHERE token = $1", [sessionToken]);
};

module.exports = {
  generateSessionToken,
  createSession,
  invalidateSession,
};
