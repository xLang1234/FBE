// services/cryptoSentiment.js
const axios = require("axios");
const logger = require("../config/logger");
const { pool } = require("../db");
const cron = require("node-cron");
const CryptoSentimentRepository = require("../repositories/cryptoSentimentRepository");
const telegramIntegration = require("./cryptoTelegramIntegration");
const {
  createCryptoSentimentTable,
  createLastUpdateTable,
} = require("../db/schemas/crypto");

class CryptoSentimentService {
  constructor() {
    this.apiKey = process.env.COINMARKETCAP_API_KEY;
    this.baseUrl = "https://pro-api.coinmarketcap.com/v3/fear-and-greed";
    this.repository = new CryptoSentimentRepository(pool);
    this.updateInterval = 24 * 60 * 60 * 1000;

    if (!this.apiKey) {
      logger.warn("COINMARKETCAP_API_KEY not found in environment variables");
    }
  }

  async initializeDatabase() {
    try {
      await createCryptoSentimentTable(pool);
      await createLastUpdateTable(pool);
      logger.info("Crypto sentiment tables created successfully");
    } catch (error) {
      logger.error("Failed to create crypto sentiment tables:", error);
      throw error;
    }
  }

  async updateSentimentData() {
    try {
      const shouldUpdate = await this.repository.shouldUpdate("historical");

      if (shouldUpdate) {
        logger.info("Updating sentiment data from API");
        const data = await this.fetchHistoricalDataFromApi(30);

        if (data && data.data) {
          const insertCount = await this.repository.saveBatch(data.data);
          logger.info(`Inserted ${insertCount} new sentiment records`);

          const nextUpdate = new Date(Date.now() + this.updateInterval);
          await this.repository.updateLastUpdated("historical", nextUpdate);
          logger.info(
            `Next sentiment data update scheduled for ${nextUpdate.toISOString()}`
          );
        }
      } else {
        logger.debug("Skipping sentiment data update - not time yet");
      }
    } catch (error) {
      logger.error("Failed to update sentiment data:", error);
    }
  }

  async fetchHistoricalDataFromApi(count = 10) {
    try {
      logger.info(`Fetching ${count} days of data from CoinMarketCap API`);
      const response = await axios.get(`${this.baseUrl}/historical`, {
        headers: {
          "X-CMC_PRO_API_KEY": this.apiKey,
          Accept: "application/json",
        },
        params: {
          count,
          format: "json",
          "invert-scale": "false",
        },
      });

      return response.data;
    } catch (error) {
      logger.error(
        "Error fetching fear and greed data from API:",
        error.message
      );
      if (error.response) {
        logger.error("API response error:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw new Error("Failed to fetch crypto sentiment data from API");
    }
  }

  async getHistoricalData(days = 10) {
    try {
      await this.updateSentimentData();

      const data = await this.repository.getHistoricalData(days);

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
      logger.error("Error getting historical data:", error);
      throw error;
    }
  }

  async getLatestData() {
    try {
      await this.updateSentimentData();

      const latest = await this.repository.getLatest();

      if (!latest) {
        throw new Error("No sentiment data available");
      }

      return {
        data: {
          timestamp: latest.timestamp,
          value: latest.value,
          value_classification: latest.value_classification,
          symbol: latest.symbol,
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
      logger.error("Error getting latest data:", error);
      throw error;
    }
  }

  analyzeSentiment(data) {
    if (!data || !Array.isArray(data)) {
      return { error: "Invalid data format" };
    }

    const sum = data.reduce((acc, item) => acc + item.value, 0);
    const average = sum / data.length;

    const sortedByDate = [...data].sort(
      (a, b) => parseInt(a.timestamp) - parseInt(b.timestamp)
    );

    const oldest = sortedByDate[0].value;
    const latest = sortedByDate[sortedByDate.length - 1].value;
    const trend =
      latest > oldest
        ? "increasing"
        : latest < oldest
        ? "decreasing"
        : "stable";

    const distribution = {};
    data.forEach((item) => {
      distribution[item.value_classification] =
        (distribution[item.value_classification] || 0) + 1;
    });

    return {
      average: parseFloat(average.toFixed(2)),
      trend,
      latestValue: latest,
      latestClassification:
        sortedByDate[sortedByDate.length - 1].value_classification,
      distribution,
      dataPoints: data.length,
    };
  }

  async processSentimentData(data) {
    try {
      const client = await pool.connect();
      const symbols = Object.keys(data);

      for (const symbol of symbols) {
        const sentimentScore = data[symbol];

        // Fetch previous sentiment to calculate change
        const previousResult = await client.query(
          "SELECT score FROM crypto_sentiment WHERE symbol = $1 ORDER BY timestamp DESC LIMIT 1",
          [symbol]
        );

        const previousScore =
          previousResult.rows.length > 0
            ? previousResult.rows[0].score
            : sentimentScore;

        // Determine trend
        let trend = "stable";
        if (sentimentScore > previousScore + 0.05) {
          trend = "up";
        } else if (sentimentScore < previousScore - 0.05) {
          trend = "down";
        }

        // Insert new sentiment record
        await client.query(
          "INSERT INTO crypto_sentiment (symbol, score, trend, value, value_classification) VALUES ($1, $2, $3, $2, $4)",
          [
            symbol,
            sentimentScore,
            trend,
            this.classifySentiment(sentimentScore),
          ]
        );

        logger.info(
          `Updated sentiment for ${symbol}: ${sentimentScore} (${trend})`
        );

        // Send notification if significant change
        await telegramIntegration.notifySentimentChange({
          symbol,
          score: sentimentScore,
          previousScore,
          trend,
        });
      }

      client.release();
      return true;
    } catch (error) {
      logger.error("Error processing sentiment data:", error);
      return false;
    }
  }

  classifySentiment(score) {
    if (score >= 80) return "extreme_greed";
    if (score >= 60) return "greed";
    if (score >= 40) return "neutral";
    if (score >= 20) return "fear";
    return "extreme_fear";
  }

  // Send daily summary
  async sendDailySummary() {
    try {
      const client = await pool.connect();

      // Get latest sentiment for each symbol (excluding USDT)
      const latestSentimentResult = await client.query(`
        WITH ranked_sentiments AS (
          SELECT 
            symbol, 
            score, 
            trend,
            timestamp,
            ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as row_num
          FROM crypto_sentiment
          WHERE symbol != 'USDT'
        )
        SELECT symbol, score, trend, timestamp
        FROM ranked_sentiments
        WHERE row_num = 1
        ORDER BY score DESC
        LIMIT 5
      `);

      // Get previous day's sentiment for percentage change calculation
      const previousDayData = await client.query(`
        SELECT 
          symbol, 
          score, 
          timestamp
        FROM crypto_sentiment
        WHERE 
          symbol != 'USDT' AND
          timestamp >= NOW() - INTERVAL '48 HOURS' AND
          timestamp < NOW() - INTERVAL '24 HOURS'
        ORDER BY timestamp DESC
      `);

      // Create a map of previous day scores
      const prevScoreMap = {};
      previousDayData.rows.forEach((row) => {
        prevScoreMap[row.symbol] = row.score;
      });

      // Calculate percentage changes
      const topCurrencies = latestSentimentResult.rows.map((row) => {
        const prevScore = prevScoreMap[row.symbol] || row.score;
        const percentChange =
          prevScore !== 0
            ? (((row.score - prevScore) / prevScore) * 100).toFixed(2)
            : "0.00";

        const direction =
          row.score > prevScore ? "↑" : row.score < prevScore ? "↓" : "→";

        return {
          symbol: row.symbol,
          score: row.score,
          percentChange: percentChange,
          direction: direction,
        };
      });

      // Get latest global fear & greed index
      const fearGreedResult = await client.query(`
        SELECT value, value_classification, timestamp
        FROM crypto_sentiment_history
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      const fearGreedIndex =
        fearGreedResult.rows.length > 0
          ? fearGreedResult.rows[0]
          : { value: "N/A", value_classification: "N/A" };

      // Prepare the summary object
      const summary = {
        timestamp: new Date().toISOString(),
        fearGreedIndex: {
          value: fearGreedIndex.value,
          classification: fearGreedIndex.value_classification,
          timestamp: fearGreedIndex.timestamp,
        },
        altcoinSeasonIndex: {
          value: "N/A",
          classification: "N/A",
          status: "API not implemented yet",
        },
        topCurrencies: topCurrencies,
      };

      // Send the summary via Telegram
      await telegramIntegration.sendDailySummary(summary);

      client.release();
      logger.info("Daily crypto sentiment summary sent successfully");
      return true;
    } catch (error) {
      logger.error("Error sending daily summary:", error);
      return false;
    }
  }

  // Update the startUpdateScheduler function to include daily summary
  startUpdateScheduler() {
    // Schedule updates every hour
    cron.schedule("0 * * * *", async () => {
      logger.info("Running scheduled sentiment update");
      await this.updateSentiments();
    });

    // Schedule daily summary at 8:00 AM
    cron.schedule("0 8 * * *", async () => {
      logger.info("Sending daily sentiment summary");
      await this.sendDailySummary();
    });
  }
}

module.exports = new CryptoSentimentService();
