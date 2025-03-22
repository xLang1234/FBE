const axios = require("axios");
const logger = require("../config/logger");
const LOG = require("../constants/logMessages");
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
      logger.info(LOG.SERVICE.TABLES_INIT_SUCCESS("Altcoin season index"));
      return true;
    } catch (error) {
      logger.error(
        LOG.SERVICE.TABLES_INIT_FAILURE("altcoin season index"),
        error
      );
      return false;
    }
  }

  async fetchAltcoinSeasonData(days = 30) {
    try {
      const endDate = Math.floor(Date.now() / 1000);
      const startDate = endDate - days * 24 * 60 * 60;

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
        throw new Error(LOG.ERROR.API_RESPONSE("CoinMarketCap"));
      }

      return response.data.data.points;
    } catch (error) {
      logger.error(LOG.DATA.FETCH_ERROR("altcoin season"), error);
      throw new Error(`Failed to fetch altcoin season data: ${error.message}`);
    }
  }

  async updateAltcoinSeasonData() {
    try {
      const shouldUpdate = await this.repository.shouldUpdate(this.updateType);

      if (!shouldUpdate) {
        logger.info(LOG.DATA.UPDATE_SKIPPED("altcoin season index"));
        return { updated: false, message: "No update needed" };
      }

      logger.info(LOG.DATA.FETCHING("altcoin season index"));
      const data = await this.fetchAltcoinSeasonData(30);

      logger.info(LOG.DATA.SAVING_RECORDS(data.length, "altcoin season index"));
      const insertedCount = await this.repository.saveBatch(data);

      const nextUpdate = new Date();
      nextUpdate.setHours(nextUpdate.getHours() + 24);

      await this.repository.updateLastUpdated(this.updateType, nextUpdate);

      logger.info(
        LOG.DATA.UPDATE_COMPLETE("Altcoin season index", insertedCount)
      );
      return {
        updated: true,
        insertedCount,
        nextUpdateTime: nextUpdate,
      };
    } catch (error) {
      logger.error(LOG.DATA.FETCH_ERROR("altcoin season index"), error);
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
      logger.error(LOG.DATA.FETCH_ERROR("historical altcoin season"), error);
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
      logger.error(LOG.DATA.FETCH_ERROR("latest altcoin season"), error);
      throw error;
    }
  }

  startUpdateScheduler() {
    const runUpdate = async () => {
      try {
        logger.info(LOG.SERVICE.SCHEDULER_RUNNING("altcoin season index"));
        await this.updateAltcoinSeasonData();
      } catch (error) {
        logger.error(LOG.SERVICE.SCHEDULER_FAILED("altcoin season"), error);
      }
    };

    setInterval(runUpdate, 60 * 60 * 1000);
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

      const sortedData = [...data].sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      const firstValue = parseFloat(sortedData[0].altcoinIndex);
      const lastValue = parseFloat(
        sortedData[sortedData.length - 1].altcoinIndex
      );
      const change = lastValue - firstValue;
      const percentChange = (change / firstValue) * 100;

      const sum = sortedData.reduce(
        (acc, item) => acc + parseFloat(item.altcoinIndex),
        0
      );
      const average = sum / sortedData.length;

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
      logger.error(LOG.DATA.FETCH_ERROR("analyzing altcoin season"), error);
      return {
        trend: "error",
        message: "Error analyzing data",
      };
    }
  }
}

module.exports = new AltcoinSeasonService();
