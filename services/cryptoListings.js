// services/cryptoListings.js
const axios = require("axios");
const logger = require("../config/logger");
const { pool } = require("../db");
const cron = require("node-cron");
const CryptoListingsRepository = require("../repositories/cryptoListingsRepository");
const telegramIntegration = require("./cryptoTelegramIntegration");
const {
  createCryptocurrenciesTable,
  createCryptocurrencyPricesTable,
  createCryptocurrencyTagsTable,
  createCryptoListingsLastUpdateTable,
} = require("../db/schemas/cryptoListings");

class CryptoListingsService {
  constructor() {
    this.apiKey = process.env.COINMARKETCAP_API_KEY;
    this.baseUrl = "https://pro-api.coinmarketcap.com/v1";
    this.repository = new CryptoListingsRepository(pool);
    this.updateInterval = 60 * 60 * 1000; // 1 hour in milliseconds

    if (!this.apiKey) {
      logger.warn("COINMARKETCAP_API_KEY not found in environment variables");
    }
  }

  async initializeDatabase() {
    try {
      await createCryptocurrenciesTable(pool);
      await createCryptocurrencyPricesTable(pool);
      await createCryptocurrencyTagsTable(pool);
      await createCryptoListingsLastUpdateTable(pool);
      logger.info("Cryptocurrency tables created successfully");
    } catch (error) {
      logger.error("Failed to create cryptocurrency tables:", error);
      throw error;
    }
  }

  async updateCryptocurrencyData() {
    try {
      const shouldUpdate = await this.repository.shouldUpdate(
        "listings/latest"
      );

      if (shouldUpdate) {
        logger.info("Updating cryptocurrency data from API");
        const data = await this.fetchLatestListingsFromApi();

        if (data && data.data) {
          const result = await this.repository.saveBatch(data.data);
          logger.info(
            `Processed ${data.data.length} cryptocurrencies: ${result.insertedCryptos} cryptos updated, ${result.insertedPrices} price points added, ${result.insertedTags} tags added`
          );

          const nextUpdate = new Date(Date.now() + this.updateInterval);
          await this.repository.updateLastUpdated(
            "listings/latest",
            nextUpdate
          );
          logger.info(
            `Next cryptocurrency data update scheduled for ${nextUpdate.toISOString()}`
          );
        }
      } else {
        logger.debug("Skipping cryptocurrency data update - not time yet");
      }
    } catch (error) {
      logger.error("Failed to update cryptocurrency data:", error);
    }
  }

  async fetchLatestListingsFromApi(limit = 200) {
    try {
      logger.info(
        `Fetching latest ${limit} cryptocurrencies from CoinMarketCap API`
      );
      const response = await axios.get(
        `${this.baseUrl}/cryptocurrency/listings/latest`,
        {
          headers: {
            "X-CMC_PRO_API_KEY": this.apiKey,
            Accept: "application/json",
          },
          params: {
            limit,
            convert: "USD",
          },
        }
      );

      return response.data;
    } catch (error) {
      logger.error(
        "Error fetching cryptocurrency data from API:",
        error.message
      );
      if (error.response) {
        logger.error("API response error:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw new Error("Failed to fetch cryptocurrency data from API");
    }
  }

  async getTopCryptocurrencies(limit = 10, offset = 0) {
    try {
      // Ensure we have up-to-date data
      await this.updateCryptocurrencyData();

      const data = await this.repository.getTopCryptocurrencies(limit, offset);

      return {
        data,
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: "",
          elapsed: 0,
          credit_count: 0,
          notice: "Data retrieved from local database",
          total_count: data.length,
        },
      };
    } catch (error) {
      logger.error("Error getting top cryptocurrencies:", error);
      throw error;
    }
  }

  async getCryptocurrencyBySymbol(symbol) {
    try {
      // Ensure we have up-to-date data
      await this.updateCryptocurrencyData();

      const data = await this.repository.getCryptocurrencyBySymbol(symbol);

      if (!data) {
        throw new Error(`Cryptocurrency with symbol ${symbol} not found`);
      }

      return {
        data,
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: "",
          elapsed: 0,
          credit_count: 0,
          notice: "Data retrieved from local database",
        },
      };
    } catch (error) {
      logger.error(`Error getting cryptocurrency by symbol ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalPrices(symbol, days = 30) {
    try {
      // First, get the cryptocurrency ID from the symbol
      const crypto = await this.repository.getCryptocurrencyBySymbol(symbol);

      if (!crypto) {
        throw new Error(`Cryptocurrency with symbol ${symbol} not found`);
      }

      const data = await this.repository.getHistoricalPrices(
        crypto.cmc_id,
        days
      );

      return {
        data,
        metadata: {
          symbol: crypto.symbol,
          name: crypto.name,
          days: days,
          data_points: data.length,
        },
        status: {
          timestamp: new Date().toISOString(),
          error_code: 0,
          error_message: "",
          elapsed: 0,
          credit_count: 0,
          notice: "Data retrieved from local database",
        },
      };
    } catch (error) {
      logger.error(`Error getting historical prices for ${symbol}:`, error);
      throw error;
    }
  }

  analyzeCryptocurrencyData(data) {
    if (!data || !Array.isArray(data)) {
      return { error: "Invalid data format" };
    }

    // Calculate percentage of green vs red
    const upCoins = data.filter((coin) => coin.percent_change_24h > 0);
    const downCoins = data.filter((coin) => coin.percent_change_24h < 0);
    const neutralCoins = data.filter((coin) => coin.percent_change_24h === 0);

    const marketStats = {
      total_coins: data.length,
      up_coins: upCoins.length,
      down_coins: downCoins.length,
      neutral_coins: neutralCoins.length,
      up_percentage: parseFloat(
        ((upCoins.length / data.length) * 100).toFixed(2)
      ),
      down_percentage: parseFloat(
        ((downCoins.length / data.length) * 100).toFixed(2)
      ),
      market_sentiment:
        upCoins.length > downCoins.length ? "bullish" : "bearish",
    };

    // Calculate average price changes
    const avgChange24h =
      data.reduce((sum, coin) => sum + (coin.percent_change_24h || 0), 0) /
      data.length;
    const avgChange7d =
      data.reduce((sum, coin) => sum + (coin.percent_change_7d || 0), 0) /
      data.length;

    // Calculate Bitcoin dominance
    const bitcoinData = data.find((coin) => coin.symbol === "BTC");
    const totalMarketCap = data.reduce(
      (sum, coin) => sum + (coin.market_cap || 0),
      0
    );
    const bitcoinDominance = bitcoinData
      ? (bitcoinData.market_cap / totalMarketCap) * 100
      : null;

    return {
      market_stats: marketStats,
      average_change_24h: parseFloat(avgChange24h.toFixed(2)),
      average_change_7d: parseFloat(avgChange7d.toFixed(2)),
      bitcoin_dominance: parseFloat(bitcoinDominance?.toFixed(2)) || null,
      timestamp: new Date().toISOString(),
    };
  }

  // Send market summary to telegram
  async sendMarketSummary() {
    try {
      const topCryptos = await this.repository.getTopCryptocurrencies(100);
      const analysis = this.analyzeCryptocurrencyData(topCryptos);

      const top5Gainers = [...topCryptos]
        .sort((a, b) => b.percent_change_24h - a.percent_change_24h)
        .slice(0, 5);

      const top5Losers = [...topCryptos]
        .sort((a, b) => a.percent_change_24h - b.percent_change_24h)
        .slice(0, 5);

      const summary = {
        timestamp: new Date().toISOString(),
        market_sentiment: analysis.market_stats.market_sentiment,
        up_down_ratio: `${analysis.market_stats.up_percentage}% up, ${analysis.market_stats.down_percentage}% down`,
        average_change_24h: analysis.average_change_24h,
        bitcoin_dominance: analysis.bitcoin_dominance,
        top_gainers: top5Gainers.map((coin) => ({
          symbol: coin.symbol,
          name: coin.name,
          change_24h: coin.percent_change_24h,
        })),
        top_losers: top5Losers.map((coin) => ({
          symbol: coin.symbol,
          name: coin.name,
          change_24h: coin.percent_change_24h,
        })),
      };

      // Send the summary via Telegram
      await telegramIntegration.sendMarketSummary(summary);

      logger.info("Cryptocurrency market summary sent successfully");
      return true;
    } catch (error) {
      logger.error("Error sending market summary:", error);
      return false;
    }
  }

  startUpdateScheduler() {
    // Schedule updates every hour
    cron.schedule("0 * * * *", async () => {
      logger.info("Running scheduled cryptocurrency data update");
      await this.updateCryptocurrencyData();
    });

    // Schedule market summary at 9:00 AM
    cron.schedule("0 9 * * *", async () => {
      logger.info("Sending daily cryptocurrency market summary");
      await this.sendMarketSummary();
    });
  }
}

module.exports = new CryptoListingsService();
