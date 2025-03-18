// routes/altcoinSeason.js
const express = require("express");
const router = express.Router();
const altcoinSeason = require("../services/altcoinSeason");
const logger = require("../config/logger");

/**
 * @route   GET /api/crypto/altcoin-season/historical
 * @desc    Get historical altcoin season data from database
 * @access  Public
 */
router.get("/altcoin-season/historical", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    logger.info(
      `Fetching ${days} days of historical altcoin season data from database`
    );
    const data = await altcoinSeason.getHistoricalData(days);

    res.json(data);
  } catch (error) {
    logger.error("Error in historical altcoin season endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/altcoin-season/latest
 * @desc    Get latest altcoin season index from database
 * @access  Public
 */
router.get("/altcoin-season/latest", async (req, res) => {
  try {
    logger.info("Fetching latest altcoin season data from database");
    const data = await altcoinSeason.getLatestData();

    res.json(data);
  } catch (error) {
    logger.error("Error in latest altcoin season endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/altcoin-season/analysis
 * @desc    Get altcoin season analysis from historical data in database
 * @access  Public
 */
router.get("/altcoin-season/analysis", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    logger.info(
      `Analyzing altcoin season data for the last ${days} days from database`
    );
    const rawData = await altcoinSeason.getHistoricalData(days);
    const analysis = altcoinSeason.analyzeAltcoinSeasonData(rawData.data);

    res.json({
      analysis,
      status: rawData.status,
    });
  } catch (error) {
    logger.error("Error in altcoin season analysis endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/altcoin-season/force-update
 * @desc    Force an update from the CoinMarketCap API (admin only)
 * @access  Private/Admin
 */
router.get("/altcoin-season/force-update", async (req, res) => {
  try {
    logger.info("Admin requested force update of altcoin season data");
    const result = await altcoinSeason.updateAltcoinSeasonData();

    res.json({
      success: true,
      message: "Altcoin season data update triggered successfully",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in force update endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
