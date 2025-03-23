// routes/telegramPublisher.js

const express = require("express");
const router = express.Router();
const telegramPublisherService = require("../services/telegramPublisherService");
const { authorize, requireRole } = require("../middleware/authorize");
const logger = require("../config/logger");

router.post("/start", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const { interval } = req.body;
    const intervalMs = interval ? parseInt(interval) * 1000 : 60000; // Default 1 minute

    telegramPublisherService.startPolling(intervalMs);

    res.status(200).json({
      message: `Telegram publisher service started with ${intervalMs}ms interval`,
    });
  } catch (error) {
    logger.error("Error starting Telegram publisher service:", error);
    res
      .status(500)
      .json({ error: "Failed to start Telegram publisher service" });
  }
});

router.post("/stop", authorize, requireRole(["admin"]), (req, res) => {
  try {
    telegramPublisherService.stopPolling();

    res.status(200).json({
      message: "Telegram publisher service stopped",
    });
  } catch (error) {
    logger.error("Error stopping Telegram publisher service:", error);
    res
      .status(500)
      .json({ error: "Failed to stop Telegram publisher service" });
  }
});

router.get("/status", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const tracking = await getTrackingInfo();

    res.status(200).json({
      isRunning: telegramPublisherService.isRunning,
      lastPublishedId: telegramPublisherService.lastPublishedId,
      tracking,
    });
  } catch (error) {
    logger.error("Error getting Telegram publisher status:", error);
    res.status(500).json({ error: "Failed to get Telegram publisher status" });
  }
});

async function getTrackingInfo() {
  const { pool } = require("../db");

  try {
    const result = await pool.query(`
      SELECT * FROM telegram_publishing_tracking 
      ORDER BY id DESC LIMIT 1;
    `);

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return null;
  } catch (error) {
    logger.error("Error getting tracking info:", error);
    return null;
  }
}

router.post(
  "/check-now",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      await telegramPublisherService.checkAndPublishNewContent();

      res.status(200).json({
        message: "Content check and publish triggered",
        lastPublishedId: telegramPublisherService.lastPublishedId,
      });
    } catch (error) {
      logger.error("Error triggering content check and publish:", error);
      res.status(500).json({ error: "Failed to check and publish content" });
    }
  }
);

module.exports = router;
