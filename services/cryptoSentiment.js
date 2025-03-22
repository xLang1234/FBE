const axios = require("axios");
const logger = require("../config/logger");
const { pool } = require("../db");
const cron = require("node-cron");
const FearAndGreedIndexRepository = require("../repositories/cryptoSentimentRepository");
const telegramIntegration = require("./cryptoTelegramIntegration");
const coinMarketCapApiManager = require("../utils/coinmarketcapApiManager");
const {
  createFearAndGreedIndexTable,
  createLastUpdateTable,
} = require("../db/schemas/cryptoSentiment");

class FearAndGreedIndexService {
  constructor() {
    this.baseUrl = "https://pro-api.coinmarketcap.com/v3/fear-and-greed";
    this.repository = new FearAndGreedIndexRepository(pool);
    this.updateInterval = 24 * 60 * 60 * 1000;
  }

  async initializeDatabase() {
    try {
      await createFearAndGreedIndexTable(pool);
      await createLastUpdateTable(pool);
      logger.info("Fear and greed index tables created successfully");
    } catch (error) {
      logger.error("Failed to create fear and greed index tables:", error);
      throw error;
    }
  }

  async updateFearAndGreedData() {
    try {
      const shouldUpdate = await this.repository.shouldUpdate("historical");

      if (shouldUpdate) {
        logger.info("Updating fear and greed index data from API");
        const data = await this.fetchHistoricalDataFromApi(30);

        if (data && data.data) {
          const insertCount = await this.repository.saveBatch(data.data);
          logger.info(
            `Inserted ${insertCount} new fear and greed index records`
          );

          const nextUpdate = new Date(Date.now() + this.updateInterval);
          await this.repository.updateLastUpdated("historical", nextUpdate);
          logger.info(
            `Next fear and greed index data update scheduled for ${nextUpdate.toISOString()}`
          );
        }
      } else {
        logger.debug(
          "Skipping fear and greed index data update - not time yet"
        );
      }
    } catch (error) {
      logger.error("Failed to update fear and greed index data:", error);
    }
  }

  async fetchHistoricalDataFromApi(count = 10) {
    try {
      const apiKey = coinMarketCapApiManager.getNextApiKey();

      logger.info(`Fetching ${count} days of data from CoinMarketCap API`);
      const response = await axios.get(`${this.baseUrl}/historical`, {
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
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

        if (error.response.status === 429) {
          logger.warn("Rate limit hit, retrying with next API key");
          return this.fetchHistoricalDataFromApi(count);
        }
      }
      throw new Error("Failed to fetch fear and greed index data from API");
    }
  }

  async getHistoricalData(days = 10) {
    try {
      await this.updateFearAndGreedData();

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
      await this.updateFearAndGreedData();

      const latest = await this.repository.getLatest();

      if (!latest) {
        throw new Error("No fear and greed index data available");
      }

      return {
        data: {
          timestamp: latest.timestamp,
          value: latest.value,
          value_classification: latest.value_classification,
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

  analyzeFearAndGreedData(data) {
    if (!data || !Array.isArray(data)) {
      return { error: "Invalid data format" };
    }

    const sum = data.reduce((acc, item) => acc + item.value, 0);
    const average = sum;

    const sortedByDate = [...data].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
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

  classifySentiment(score) {
    if (score >= 80) return "extreme_greed";
    if (score >= 60) return "greed";
    if (score >= 40) return "neutral";
    if (score >= 20) return "fear";
    return "extreme_fear";
  }

  async sendDailySummary() {
    try {
      const client = await pool.connect();

      const fearGreedResult = await client.query(`
        SELECT value, value_classification, timestamp
        FROM fear_and_greed_index
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      const fearGreedIndex =
        fearGreedResult.rows.length > 0
          ? fearGreedResult.rows[0]
          : { value: "N/A", value_classification: "N/A" };

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
      };

      await telegramIntegration.sendDailySummary(summary);

      client.release();
      logger.info("Daily fear and greed index summary sent successfully");
      return true;
    } catch (error) {
      logger.error("Error sending daily summary:", error);
      return false;
    }
  }

  startUpdateScheduler() {
    cron.schedule("0 * * * *", async () => {
      logger.info("Running scheduled fear and greed index update");
      await this.updateFearAndGreedData();
    });

    cron.schedule("0 8 * * *", async () => {
      logger.info("Sending daily fear and greed index summary");
      await this.sendDailySummary();
    });
  }
}

module.exports = new FearAndGreedIndexService();
