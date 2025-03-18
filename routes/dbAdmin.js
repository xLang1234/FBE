/**
 * Database administration routes
 * SECURITY NOTICE: These endpoints should be adequately protected
 * or disabled in production environments
 */

const express = require("express");
const router = express.Router();
const { dropAllTables } = require("../db/dropAllTables");
const { initializeDatabase } = require("../db");
const logger = require("../config/logger");

// Middleware to check for admin authorization
const adminAuth = (req, res, next) => {
  // This is a placeholder. In a real app, implement proper authentication
  // such as checking for admin role in a JWT token
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || req.headers.authorization !== `Bearer ${adminKey}`) {
    return res.status(401).json({ error: "Unauthorized access" });
  }

  // For development environments only
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({
      error: "This endpoint is disabled in production",
    });
  }

  next();
};

// Drop all tables
router.post("/drop-tables", adminAuth, async (req, res) => {
  try {
    // Add a confirmation check to prevent accidental calls
    const { confirm } = req.body;

    if (confirm !== "I understand the consequences") {
      return res.status(400).json({
        error: "Confirmation phrase required",
      });
    }

    const result = await dropAllTables();

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    logger.error("Error in drop-tables endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Reset database (drop and recreate)
router.post("/reset-database", adminAuth, async (req, res) => {
  try {
    // Add a confirmation check to prevent accidental calls
    const { confirm } = req.body;

    if (confirm !== "I understand the consequences") {
      return res.status(400).json({
        error: "Confirmation phrase required",
      });
    }

    // Drop all existing tables
    const dropResult = await dropAllTables();

    if (!dropResult.success) {
      return res.status(500).json({
        error: "Failed to drop tables",
        details: dropResult,
      });
    }

    // Reinitialize database
    await initializeDatabase();

    // Initialize crypto sentiment tables if the service is available
    try {
      const cryptoSentiment = require("../services/cryptoSentiment");
      await cryptoSentiment.initializeDatabase();
    } catch (err) {
      logger.warn("Could not initialize crypto sentiment tables:", err.message);
    }

    return res.status(200).json({
      success: true,
      message: "Database reset successfully",
      tablesDropped: dropResult.tablesDropped,
    });
  } catch (error) {
    logger.error("Error in reset-database endpoint:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

module.exports = router;
