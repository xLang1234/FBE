// routes/cryptoListings.js
const express = require("express");
const router = express.Router();
const cryptoListings = require("../services/cryptoListings");
const logger = require("../config/logger");
const { CRYPTO, ERROR } = require("../constants/logMessages");

router.get("/listings/top", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    logger.info(CRYPTO.FETCH_TOP_CRYPTO(limit, offset));
    const data = await cryptoListings.getTopCryptocurrencies(limit, offset);

    res.json(data);
  } catch (error) {
    logger.error(CRYPTO.TOP_CRYPTO_ERROR, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/listings/symbol/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;

    logger.info(CRYPTO.FETCH_CRYPTO_BY_SYMBOL(symbol));
    const data = await cryptoListings.getCryptocurrencyBySymbol(symbol);

    res.json(data);
  } catch (error) {
    logger.error(CRYPTO.SYMBOL_FETCH_ERROR(req.params.symbol), error);
    res.status(404).json({ error: error.message });
  }
});

router.get("/listings/historical/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const days = parseInt(req.query.days) || 30;

    logger.info(CRYPTO.FETCH_HISTORICAL_CRYPTO(days, symbol));
    const data = await cryptoListings.getHistoricalPrices(symbol, days);

    res.json(data);
  } catch (error) {
    logger.error(CRYPTO.HISTORICAL_PRICES_ERROR(req.params.symbol), error);
    res.status(404).json({ error: error.message });
  }
});

router.get("/listings/market-analysis", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    logger.info(CRYPTO.ANALYZE_MARKET_DATA(limit));
    const topCryptos = await cryptoListings.getTopCryptocurrencies(limit);
    const analysis = cryptoListings.analyzeCryptocurrencyData(topCryptos.data);

    res.json({
      analysis,
      status: topCryptos.status,
    });
  } catch (error) {
    logger.error(CRYPTO.ANALYSIS_ERROR, error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/listings/force-update", async (req, res) => {
  try {
    logger.info(CRYPTO.FORCE_UPDATE_CRYPTO);
    await cryptoListings.updateCryptocurrencyData();

    res.json({
      success: true,
      message: "Cryptocurrency data update triggered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(ERROR.FEAR_GREED_UPDATE, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
