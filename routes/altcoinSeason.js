// routes/altcoinSeason.js
const express = require("express");
const router = express.Router();
const altcoinSeason = require("../services/altcoinSeason");
const logger = require("../config/logger");
const { ROUTES, ERROR } = require("../constants/logMessages");

router.get("/altcoin-season/historical", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    logger.info(ROUTES.ALTCOIN_HISTORICAL(days));
    const data = await altcoinSeason.getHistoricalData(days);

    res.json(data);
  } catch (error) {
    logger.error(ERROR.ALTCOIN_SEASON_HISTORICAL, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/altcoin-season/latest", async (req, res) => {
  try {
    logger.info(ROUTES.ALTCOIN_LATEST);
    const data = await altcoinSeason.getLatestData();

    res.json(data);
  } catch (error) {
    logger.error(ERROR.ALTCOIN_SEASON_LATEST, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/altcoin-season/analysis", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    logger.info(ROUTES.ALTCOIN_ANALYSIS(days));
    const rawData = await altcoinSeason.getHistoricalData(days);
    const analysis = altcoinSeason.analyzeAltcoinSeasonData(rawData.data);

    res.json({
      analysis,
      status: rawData.status,
    });
  } catch (error) {
    logger.error(ERROR.ALTCOIN_SEASON_ANALYSIS, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/altcoin-season/force-update", async (req, res) => {
  try {
    logger.info(ROUTES.ALTCOIN_FORCE_UPDATE);
    const result = await altcoinSeason.updateAltcoinSeasonData();

    res.json({
      success: true,
      message: ROUTES.ALTCOIN_UPDATE_SUCCESS,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(ERROR.ALTCOIN_SEASON_UPDATE, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
