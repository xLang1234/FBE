// routes/crypto.js
const express = require("express");
const router = express.Router();
const fearAndGreedIndex = require("../services/cryptoSentiment");
const logger = require("../config/logger");

/**
 * @route   GET /api/crypto/fear-and-greed/historical
 * @desc    Get historical fear and greed data from database
 * @access  Public
 */
router.get("/fear-and-greed/historical", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    logger.info(
      `Fetching ${days} days of historical fear and greed index data from database`
    );
    const data = await fearAndGreedIndex.getHistoricalData(days);

    res.json(data);
  } catch (error) {
    logger.error("Error in historical fear and greed index endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/fear-and-greed/latest
 * @desc    Get latest fear and greed index from database
 * @access  Public
 */
router.get("/fear-and-greed/latest", async (req, res) => {
  try {
    logger.info("Fetching latest fear and greed index data from database");
    const data = await fearAndGreedIndex.getLatestData();

    res.json(data);
  } catch (error) {
    logger.error("Error in latest fear and greed index endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/fear-and-greed/analysis
 * @desc    Get fear and greed analysis from historical data in database
 * @access  Public
 */
router.get("/fear-and-greed/analysis", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    logger.info(
      `Analyzing fear and greed index data for the last ${days} days from database`
    );
    const rawData = await fearAndGreedIndex.getHistoricalData(days);
    const analysis = fearAndGreedIndex.analyzeFearAndGreedData(rawData.data);

    res.json({
      analysis,
      status: rawData.status,
    });
  } catch (error) {
    logger.error("Error in fear and greed index analysis endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/fear-and-greed/force-update
 * @desc    Force an update from the CoinMarketCap API (admin only)
 * @access  Private/Admin
 */
router.get("/fear-and-greed/force-update", async (req, res) => {
  try {
    logger.info("Admin requested force update of fear and greed index data");
    await fearAndGreedIndex.updateFearAndGreedData();

    res.json({
      success: true,
      message: "Fear and greed index data update triggered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in force update endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manual endpoint to trigger daily summary
 */
router.post("/daily-summary", async (req, res) => {
  try {
    await fearAndGreedIndex.sendDailySummary();
    res.status(200).json({ message: "Daily summary sent" });
  } catch (error) {
    logger.error("Error sending daily summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
