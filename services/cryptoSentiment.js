const axios = require("axios");
const logger = require("../config/logger");
const { pool } = require("../config/db");
const CryptoSentimentRepository = require("../repositories/cryptoSentimentRepository");

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
    const {
      createCryptoSentimentTable,
      createLastUpdateTable,
    } = require("../db/schemas/cryptoSentiment");

    try {
      await createCryptoSentimentTable(pool);
      await createLastUpdateTable(pool);
      logger.info("Crypto sentiment tables created successfully");
    } catch (error) {
      logger.error("Failed to create crypto sentiment tables:", error);
      throw error;
    }
  }

  startUpdateScheduler() {
    this.updateSentimentData();

    setInterval(() => this.updateSentimentData(), this.updateInterval);
    logger.info(
      `Scheduled sentiment data updates every ${
        this.updateInterval / 60000
      } minutes`
    );
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
}

module.exports = new CryptoSentimentService();
