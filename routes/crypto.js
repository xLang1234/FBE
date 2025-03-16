// routes/crypto.js
const express = require("express");
const router = express.Router();
const cryptoSentiment = require("../services/cryptoSentiment");
const logger = require("../config/logger");

/**
 * @route   GET /api/crypto/sentiment/historical
 * @desc    Get historical fear and greed data from database
 * @access  Public
 */
router.get("/sentiment/historical", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    logger.info(
      `Fetching ${days} days of historical sentiment data from database`
    );
    const data = await cryptoSentiment.getHistoricalData(days);

    res.json(data);
  } catch (error) {
    logger.error("Error in historical sentiment endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/sentiment/latest
 * @desc    Get latest fear and greed index from database
 * @access  Public
 */
router.get("/sentiment/latest", async (req, res) => {
  try {
    logger.info("Fetching latest sentiment data from database");
    const data = await cryptoSentiment.getLatestData();

    res.json(data);
  } catch (error) {
    logger.error("Error in latest sentiment endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/sentiment/analysis
 * @desc    Get sentiment analysis from historical data in database
 * @access  Public
 */
router.get("/sentiment/analysis", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    logger.info(
      `Analyzing sentiment data for the last ${days} days from database`
    );
    const rawData = await cryptoSentiment.getHistoricalData(days);
    const analysis = cryptoSentiment.analyzeSentiment(rawData.data);

    res.json({
      analysis,
      status: rawData.status,
    });
  } catch (error) {
    logger.error("Error in sentiment analysis endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/sentiment/force-update
 * @desc    Force an update from the CoinMarketCap API (admin only)
 * @access  Private/Admin
 */
router.get("/sentiment/force-update", async (req, res) => {
  try {
    logger.info("Admin requested force update of sentiment data");
    await cryptoSentiment.updateSentimentData();

    res.json({
      success: true,
      message: "Sentiment data update triggered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in force update endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
