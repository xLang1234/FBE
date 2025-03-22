// routes/crypto.js
const express = require("express");
const router = express.Router();
const fearAndGreedIndex = require("../services/cryptoSentiment");
const logger = require("../config/logger");
const { SENTIMENT, ERROR } = require("../constants/logMessages");

router.get("/fear-and-greed/historical", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    logger.info(SENTIMENT.FETCH_HISTORICAL(days));
    const data = await fearAndGreedIndex.getHistoricalData(days);

    res.json(data);
  } catch (error) {
    logger.error(ERROR.FEAR_GREED_HISTORICAL, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/fear-and-greed/latest", async (req, res) => {
  try {
    logger.info(SENTIMENT.FETCH_LATEST);
    const data = await fearAndGreedIndex.getLatestData();

    res.json(data);
  } catch (error) {
    logger.error(ERROR.FEAR_GREED_LATEST, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/fear-and-greed/analysis", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 10;

    logger.info(SENTIMENT.ANALYZE_DATA(days));
    const rawData = await fearAndGreedIndex.getHistoricalData(days);
    const analysis = fearAndGreedIndex.analyzeFearAndGreedData(rawData.data);

    res.json({
      analysis,
      status: rawData.status,
    });
  } catch (error) {
    logger.error(ERROR.FEAR_GREED_ANALYSIS, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/fear-and-greed/force-update", async (req, res) => {
  try {
    logger.info(SENTIMENT.FORCE_UPDATE);
    await fearAndGreedIndex.updateFearAndGreedData();

    res.json({
      success: true,
      message: "Fear and greed index data update triggered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(ERROR.FEAR_GREED_UPDATE, error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/daily-summary", async (req, res) => {
  try {
    await fearAndGreedIndex.sendDailySummary();
    logger.info(CRYPTO.DAILY_SUMMARY_SUCCESS);
    res.status(200).json({ message: "Daily summary sent" });
  } catch (error) {
    logger.error(CRYPTO.DAILY_SUMMARY_ERROR, error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
