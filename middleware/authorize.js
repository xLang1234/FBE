const logger = require("../config/logger");
const { pool } = require("../config/db");

// Authorization middleware
const authorize = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Missing or invalid authorization header");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Check if session exists and is valid
    const result = await pool.query(
      "SELECT s.*, u.id as user_id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      logger.warn("Invalid or expired session token");
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    // Add user info to request
    req.user = {
      id: result.rows[0].user_id,
      email: result.rows[0].email,
    };

    next();
  } catch (error) {
    logger.error("Authorization error:", error);
    res.status(500).json({ error: "Authorization failed" });
  }
};

module.exports = authorize;
