const logger = require("../config/logger");

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
};

module.exports = errorHandler;
