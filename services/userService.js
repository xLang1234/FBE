// services/userService.js

const logger = require("../config/logger");
const { pool } = require("../config/db");

// Get user profile
async function getUserProfile(userId) {
  try {
    // Get user profile data
    const result = await pool.query(
      "SELECT id, username, name, email, picture, created_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return { error: "User not found", status: 404 };
    }

    logger.info("User profile accessed", { userId });
    return { user: result.rows[0] };
  } catch (error) {
    logger.error("Profile fetch error:", error);
    throw error;
  }
}

module.exports = {
  getUserProfile,
};
