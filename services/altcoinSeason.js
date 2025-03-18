// services/altcoinSeason.js
const axios = require("axios");
const logger = require("../config/logger");
const { pool } = require("../db");
const AltcoinSeasonRepository = require("../repositories/altcoinSeasonRepository");
const {
  createAltcoinSeasonIndexTable,
} = require("../db/schemas/altcoinSeason");

class AltcoinSeasonService {
  constructor() {
    this.repository = new AltcoinSeasonRepository(pool);
    this.updateType = "altcoin_season_index";
  }

  async initializeDatabase() {
    try {
      await createAltcoinSeasonIndexTable(pool);
      logger.info("Altcoin season index tables initialized");
      return true;
    } catch (error) {
      logger.error("Failed to initialize altcoin season index tables:", error);
      return false;
    }
  }

  async fetchAltcoinSeasonData(days = 30) {
    try {
      // Calculate timestamps for the date range (now - days to now)
      const endDate = Math.floor(Date.now() / 1000); // current time in seconds
      const startDate = endDate - days * 24 * 60 * 60; // days back in seconds

      const url = `https://api.coinmarketcap.com/data-api/v3/altcoin-season/chart?start=${startDate}&end=${endDate}&convertId=2781`;

      const response = await axios.get(url, {
        headers: {
          accept: "application/json, text/plain, */*",
          platform: "web",
          "sec-ch-ua":
            '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          Referer: "https://coinmarketcap.com/",
          "Referrer-Policy": "origin-when-cross-origin",
        },
      });

      if (!response.data || !response.data.data || !response.data.data.points) {
        throw new Error("Invalid response format from CoinMarketCap API");
      }

      return response.data.data.points;
    } catch (error) {
      logger.error("Error fetching altcoin season data:", error);
      throw new Error(`Failed to fetch altcoin season data: ${error.message}`);
    }
  }

  async updateAltcoinSeasonData() {
    try {
      // Check if update is needed
      const shouldUpdate = await this.repository.shouldUpdate(this.updateType);

      if (!shouldUpdate) {
        logger.info("Skipping altcoin season index update - not time yet");
        return { updated: false, message: "No update needed" };
      }

      logger.info("Fetching altcoin season index data from CoinMarketCap");
      const data = await this.fetchAltcoinSeasonData(30); // Get last 30 days of data

      logger.info(`Saving ${data.length} altcoin season index records`);
      const insertedCount = await this.repository.saveBatch(data);

      // Calculate next update time (24 hours from now)
      const nextUpdate = new Date();
      nextUpdate.setHours(nextUpdate.getHours() + 24);

      await this.repository.updateLastUpdated(this.updateType, nextUpdate);

      logger.info(
        `Altcoin season index update complete. Inserted ${insertedCount} new records`
      );
      return {
        updated: true,
        insertedCount,
        nextUpdateTime: nextUpdate,
      };
    } catch (error) {
      logger.error("Error updating altcoin season index data:", error);
      throw error;
    }
  }

  async getHistoricalData(days = 30) {
    try {
      const data = await this.repository.getHistoricalData(days);
      return {
        status: "success",
        data: data.map((item) => ({
          timestamp: item.timestamp,
          altcoinIndex: parseFloat(item.altcoin_index),
          altcoinMarketcap: parseFloat(item.altcoin_marketcap),
        })),
      };
    } catch (error) {
      logger.error("Error getting historical altcoin season data:", error);
      throw error;
    }
  }

  async getLatestData() {
    try {
      const data = await this.repository.getLatest();

      if (!data) {
        return { status: "error", message: "No altcoin season data available" };
      }

      return {
        status: "success",
        data: {
          timestamp: data.timestamp,
          altcoinIndex: parseFloat(data.altcoin_index),
          altcoinMarketcap: parseFloat(data.altcoin_marketcap),
        },
      };
    } catch (error) {
      logger.error("Error getting latest altcoin season data:", error);
      throw error;
    }
  }

  // Start scheduler for daily updates
  startUpdateScheduler() {
    const runUpdate = async () => {
      try {
        logger.info("Running scheduled update for altcoin season index");
        await this.updateAltcoinSeasonData();
      } catch (error) {
        logger.error("Scheduled altcoin season update failed:", error);
      }
    };

    // Check every hour if an update is needed
    setInterval(runUpdate, 60 * 60 * 1000);

    // Also run immediately on startup
    runUpdate();
  }

  analyzeAltcoinSeasonData(data) {
    try {
      if (!data || data.length === 0) {
        return {
          trend: "unknown",
          message: "No data available for analysis",
        };
      }

      // Sort data by timestamp (oldest first)
      const sortedData = [...data].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      // Calculate trend
      const firstValue = parseFloat(sortedData[0].altcoinIndex);
      const lastValue = parseFloat(
        sortedData[sortedData.length - 1].altcoinIndex
      );
      const change = lastValue - firstValue;
      const percentChange = (change / firstValue) * 100;

      // Calculate average
      const sum = sortedData.reduce(
        (acc, item) => acc + parseFloat(item.altcoinIndex),
        0
      );
      const average = sum / sortedData.length;

      // Determine market condition based on latest value
      let marketCondition;
      if (lastValue >= 75) {
        marketCondition = "Strong Altcoin Season";
      } else if (lastValue >= 50) {
        marketCondition = "Moderate Altcoin Season";
      } else if (lastValue >= 25) {
        marketCondition = "Bitcoin Dominance";
      } else {
        marketCondition = "Strong Bitcoin Dominance";
      }

      return {
        trend: change > 0 ? "upward" : change < 0 ? "downward" : "neutral",
        percentChange: percentChange.toFixed(2),
        average: average.toFixed(2),
        marketCondition,
        latestValue: lastValue.toFixed(2),
        message: `The altcoin index is at ${lastValue.toFixed(
          2
        )}, indicating ${marketCondition}.`,
      };
    } catch (error) {
      logger.error("Error analyzing altcoin season data:", error);
      return {
        trend: "error",
        message: "Error analyzing data",
      };
    }
  }
}

module.exports = new AltcoinSeasonService();
