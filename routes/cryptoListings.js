// routes/cryptoListings.js
const express = require("express");
const router = express.Router();
const cryptoListings = require("../services/cryptoListings");
const logger = require("../config/logger");

/**
 * @route   GET /api/crypto/listings/top
 * @desc    Get top cryptocurrencies by market cap
 * @access  Public
 */
router.get("/listings/top", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    logger.info(`Fetching top ${limit} cryptocurrencies with offset ${offset}`);
    const data = await cryptoListings.getTopCryptocurrencies(limit, offset);

    res.json(data);
  } catch (error) {
    logger.error("Error in top cryptocurrencies endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/listings/symbol/:symbol
 * @desc    Get cryptocurrency data by symbol
 * @access  Public
 */
router.get("/listings/symbol/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;

    logger.info(`Fetching cryptocurrency data for symbol ${symbol}`);
    const data = await cryptoListings.getCryptocurrencyBySymbol(symbol);

    res.json(data);
  } catch (error) {
    logger.error(
      `Error in cryptocurrency by symbol endpoint for ${req.params.symbol}:`,
      error
    );
    res.status(404).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/listings/historical/:symbol
 * @desc    Get historical price data for a cryptocurrency
 * @access  Public
 */
router.get("/listings/historical/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol;
    const days = parseInt(req.query.days) || 30;

    logger.info(`Fetching ${days} days of historical data for ${symbol}`);
    const data = await cryptoListings.getHistoricalPrices(symbol, days);

    res.json(data);
  } catch (error) {
    logger.error(
      `Error in historical prices endpoint for ${req.params.symbol}:`,
      error
    );
    res.status(404).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/listings/market-analysis
 * @desc    Get market analysis based on top cryptocurrencies
 * @access  Public
 */
router.get("/listings/market-analysis", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    logger.info(`Analyzing market data for top ${limit} cryptocurrencies`);
    const topCryptos = await cryptoListings.getTopCryptocurrencies(limit);
    const analysis = cryptoListings.analyzeCryptocurrencyData(topCryptos.data);

    res.json({
      analysis,
      status: topCryptos.status,
    });
  } catch (error) {
    logger.error("Error in market analysis endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/crypto/listings/force-update
 * @desc    Force an update from the CoinMarketCap API (admin only)
 * @access  Private/Admin
 */
router.get("/listings/force-update", async (req, res) => {
  try {
    logger.info("Admin requested force update of cryptocurrency data");
    await cryptoListings.updateCryptocurrencyData();

    res.json({
      success: true,
      message: "Cryptocurrency data update triggered successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error in force update endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
