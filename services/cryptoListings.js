// services/cryptoListings.js
const axios = require("axios");
const logger = require("../config/logger");
const { pool } = require("../db");
const db = require("../db");
const cron = require("node-cron");
const telegramIntegration = require("./cryptoTelegramIntegration");
const { initializeCryptoTables } = require("../db/schemas/cryptoListings");

const {
  createCryptocurrenciesTable,
  createCryptocurrencyPricesTable,
  createCryptocurrencyTagsTable,
  createCryptoListingsLastUpdateTable,
} = require("../db/schemas/cryptoListings");

class CryptoListingsService {
  constructor() {
    // Replace single API key with an array of keys
    this.apiKeys = this.loadApiKeys();
    this.currentKeyIndex = 0;
    this.baseUrl = "https://pro-api.coinmarketcap.com/v1";
    this.updateInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

    if (!this.apiKeys.length) {
      logger.warn("No COINMARKETCAP_API_KEYs found in environment variables");
    } else {
      logger.info(`Loaded ${this.apiKeys.length} CoinMarketCap API keys`);
    }
  }

  // Load API keys from environment variables
  loadApiKeys() {
    const keys = [];

    // Primary key
    if (process.env.COINMARKETCAP_API_KEY) {
      keys.push(process.env.COINMARKETCAP_API_KEY);
    }

    // Additional keys (format: COINMARKETCAP_API_KEY_1, COINMARKETCAP_API_KEY_2, etc.)
    for (let i = 1; i <= 100; i++) {
      const keyName = `COINMARKETCAP_API_KEY_${i}`;
      if (process.env[keyName]) {
        keys.push(process.env[keyName]);
      }
    }

    return keys;
  }

  // Get the next API key in rotation
  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      logger.error("No API keys available");
      throw new Error("No API keys configured");
    }

    const apiKey = this.apiKeys[this.currentKeyIndex];

    // Move to the next key for the next request
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

    return apiKey;
  }

  async initializeDatabase() {
    try {
      const client = await pool.connect();
      await initializeCryptoTables(client);
      return true;
    } catch (error) {
      logger.error("Failed to initialize cryptocurrency tables:", error);
      throw error;
    }
  }

  async shouldUpdate(endpoint) {
    try {
      const client = await pool.connect();
      const result = await client.query(
        `SELECT next_update_at FROM cryptocurrency_listings_last_update WHERE endpoint = $1`,
        [endpoint]
      );

      client.release();

      if (result.rows.length === 0) {
        // No record exists, we should update
        return true;
      }

      const nextUpdateAt = new Date(result.rows[0].next_update_at);
      const now = new Date();

      // return now >= nextUpdateAt;
      return true;
    } catch (error) {
      logger.error("Error checking if update is needed:", error);
      // If there's an error, assume we should update
      return true;
    }
  }

  async updateLastUpdated(endpoint) {
    try {
      const nextUpdate = new Date(Date.now() + this.updateInterval);
      const client = await pool.connect();

      await client.query(
        `
        INSERT INTO cryptocurrency_listings_last_update (endpoint, last_updated_at, next_update_at)
        VALUES ($1, NOW(), $2)
        ON CONFLICT (endpoint) 
        DO UPDATE SET last_updated_at = NOW(), next_update_at = $2
        `,
        [endpoint, nextUpdate]
      );

      client.release();
      logger.info(
        `Next ${endpoint} update scheduled for ${nextUpdate.toISOString()}`
      );
    } catch (error) {
      logger.error("Error updating last updated timestamp:", error);
      throw error;
    }
  }

  async updateCryptocurrencyData() {
    try {
      if (await this.shouldUpdate("listings/latest")) {
        logger.info("Updating cryptocurrency data from CoinMarketCap API");
        const data = await this.fetchListingsFromApi();

        if (data && data.data) {
          await this.saveCryptocurrencies(data.data);
          await this.saveLatestPrices(data.data);
          await this.updateLastUpdated("listings/latest");
        }
      } else {
        logger.debug("Skipping cryptocurrency data update - not time yet");
      }
    } catch (error) {
      logger.error("Failed to update cryptocurrency data:", error);
      throw error;
    }
  }

  async fetchListingsFromApi(limit = 100) {
    try {
      // Get the next API key in rotation
      const apiKey = this.getNextApiKey();

      logger.info(
        `Fetching top ${limit} cryptocurrencies from CoinMarketCap API (using key index: ${this.currentKeyIndex === 0 ? this.apiKeys.length - 1 : this.currentKeyIndex - 1})`
      );

      const response = await axios.get(
        `${this.baseUrl}/cryptocurrency/listings/latest`,
        {
          headers: {
            "X-CMC_PRO_API_KEY": apiKey,
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
        "Error fetching cryptocurrency listings from API:",
        error.message
      );
      if (error.response) {
        logger.error("API response error:", {
          status: error.response.status,
          data: error.response.data,
        });

        // If we get rate limited, try another key immediately (if available)
        if (error.response.status === 429 && this.apiKeys.length > 1) {
          logger.warn("Rate limit hit, retrying with next API key");
          return this.fetchListingsFromApi(limit);
        }
      }
      throw new Error("Failed to fetch cryptocurrency listings from API");
    }
  }

  async saveCryptocurrencies(cryptoData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      for (const crypto of cryptoData) {
        // Insert into cryptocurrencies table
        await client.query(
          `
          INSERT INTO cryptocurrencies (
            cmc_id, name, symbol, slug, max_supply, 
            infinite_supply, date_added, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (cmc_id) 
          DO UPDATE SET 
            name = $2,
            symbol = $3,
            slug = $4,
            max_supply = $5,
            infinite_supply = $6,
            updated_at = NOW()
          `,
          [
            crypto.id,
            crypto.name,
            crypto.symbol,
            crypto.slug,
            crypto.max_supply || null,
            crypto.infinite_supply || false,
            crypto.date_added || new Date(),
          ]
        );

        // Insert tags if available
        if (crypto.tags && Array.isArray(crypto.tags)) {
          for (const tag of crypto.tags) {
            await client.query(
              `
              INSERT INTO cryptocurrency_tags (cmc_id, tag)
              VALUES ($1, $2)
              ON CONFLICT (cmc_id, tag) DO NOTHING
              `,
              [crypto.id, tag]
            );
          }
        }
      }

      await client.query("COMMIT");
      logger.info(`Saved ${cryptoData.length} cryptocurrencies to database`);
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error saving cryptocurrencies to database:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async saveLatestPrices(cryptoData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const timestamp = new Date();

      for (const crypto of cryptoData) {
        const quote = crypto.quote.USD;
        console.log(
          "🚀 ~ CryptoListingsService ~ saveLatestPrices ~ quote:",
          quote
        );

        await client.query(
          `
          INSERT INTO cryptocurrency_prices (
            cmc_id, timestamp, price_usd, volume_24h, 
            volume_change_24h, percent_change_1h, percent_change_24h, 
            percent_change_7d, market_cap, market_cap_dominance, 
            fully_diluted_market_cap, circulating_supply, 
            total_supply, cmc_rank, num_market_pairs
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          ON CONFLICT (cmc_id, timestamp) 
          DO UPDATE SET 
            price_usd = $3,
            volume_24h = $4,
            volume_change_24h = $5,
            percent_change_1h = $6,
            percent_change_24h = $7,
            percent_change_7d = $8,
            market_cap = $9,
            market_cap_dominance = $10,
            fully_diluted_market_cap = $11,
            circulating_supply = $12,
            total_supply = $13,
            cmc_rank = $14,
            num_market_pairs = $15
          `,
          [
            crypto.id,
            timestamp,
            quote.price || null,
            quote.volume_24h || null,
            quote.volume_change_24h || null,
            quote.percent_change_1h || null,
            quote.percent_change_24h || null,
            quote.percent_change_7d || null,
            quote.market_cap || null,
            quote.market_cap_dominance || null,
            quote.fully_diluted_market_cap || null,
            crypto.circulating_supply || null,
            crypto.total_supply || null,
            crypto.cmc_rank || null,
            crypto.num_market_pairs || null,
          ]
        );
      }

      await client.query("COMMIT");
      logger.info(
        `Saved latest prices for ${cryptoData.length} cryptocurrencies`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error saving cryptocurrency prices to database:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTopCryptocurrencies(limit = 10, offset = 0) {
    await this.updateCryptocurrencyData();

    try {
      const client = await pool.connect();
      const result = await client.query(
        `
        SELECT 
          c.cmc_id, c.name, c.symbol, c.slug, c.max_supply, c.infinite_supply,
          p.price_usd, p.volume_24h, p.percent_change_24h, p.market_cap,
          p.circulating_supply, p.cmc_rank, p.percent_change_7d
        FROM cryptocurrencies c
        JOIN (
          SELECT DISTINCT ON (cmc_id) 
            cmc_id, price_usd, volume_24h, percent_change_24h, market_cap,
            circulating_supply, cmc_rank, percent_change_7d, timestamp
          FROM cryptocurrency_prices 
          ORDER BY cmc_id, timestamp DESC
        ) p ON c.cmc_id = p.cmc_id
        ORDER BY p.market_cap DESC NULLS LAST
        LIMIT $1 OFFSET $2
        `,
        [limit, offset]
      );

      // Get tags for each cryptocurrency
      const cryptosWithTags = [];
      for (const crypto of result.rows) {
        const tagResult = await client.query(
          `SELECT tag FROM cryptocurrency_tags WHERE cmc_id = $1`,
          [crypto.cmc_id]
        );

        crypto.tags = tagResult.rows.map((row) => row.tag);
        cryptosWithTags.push(crypto);
      }

      client.release();

      return {
        data: cryptosWithTags,
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
      logger.error("Error getting top cryptocurrencies:", error);
      throw error;
    }
  }

  async getCryptocurrencyBySymbol(symbol) {
    await this.updateCryptocurrencyData();

    try {
      const client = await pool.connect();
      const result = await client.query(
        `
        SELECT 
          c.cmc_id, c.name, c.symbol, c.slug, c.max_supply, c.infinite_supply
        FROM cryptocurrencies c
        WHERE UPPER(c.symbol) = UPPER($1)
        `,
        [symbol]
      );

      if (result.rows.length === 0) {
        client.release();
        throw new Error(`Cryptocurrency with symbol ${symbol} not found`);
      }

      const crypto = result.rows[0];

      // Get latest price data
      const priceResult = await client.query(
        `
        SELECT 
          price_usd, volume_24h, volume_change_24h, percent_change_1h, 
          percent_change_24h, percent_change_7d, market_cap, 
          market_cap_dominance, fully_diluted_market_cap, 
          circulating_supply, total_supply, cmc_rank, timestamp
        FROM cryptocurrency_prices
        WHERE cmc_id = $1
        ORDER BY timestamp DESC
        LIMIT 1
        `,
        [crypto.cmc_id]
      );

      if (priceResult.rows.length > 0) {
        crypto.quote = {
          USD: {
            price: priceResult.rows[0].price_usd,
            volume_24h: priceResult.rows[0].volume_24h,
            volume_change_24h: priceResult.rows[0].volume_change_24h,
            percent_change_1h: priceResult.rows[0].percent_change_1h,
            percent_change_24h: priceResult.rows[0].percent_change_24h,
            percent_change_7d: priceResult.rows[0].percent_change_7d,
            market_cap: priceResult.rows[0].market_cap,
            market_cap_dominance: priceResult.rows[0].market_cap_dominance,
            fully_diluted_market_cap:
              priceResult.rows[0].fully_diluted_market_cap,
            last_updated: priceResult.rows[0].timestamp,
          },
        };
        crypto.circulating_supply = priceResult.rows[0].circulating_supply;
        crypto.total_supply = priceResult.rows[0].total_supply;
        crypto.cmc_rank = priceResult.rows[0].cmc_rank;
      }

      // Get tags
      const tagResult = await client.query(
        `SELECT tag FROM cryptocurrency_tags WHERE cmc_id = $1`,
        [crypto.cmc_id]
      );

      crypto.tags = tagResult.rows.map((row) => row.tag);

      client.release();

      return {
        data: crypto,
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
      const client = await pool.connect();

      // First find the cryptocurrency ID by symbol
      const cryptoResult = await client.query(
        `SELECT cmc_id FROM cryptocurrencies WHERE UPPER(symbol) = UPPER($1)`,
        [symbol]
      );

      if (cryptoResult.rows.length === 0) {
        client.release();
        throw new Error(`Cryptocurrency with symbol ${symbol} not found`);
      }

      const cmcId = cryptoResult.rows[0].cmc_id;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get historical prices
      const pricesResult = await client.query(
        `
        SELECT 
          timestamp, price_usd, volume_24h, percent_change_24h,
          market_cap, circulating_supply
        FROM cryptocurrency_prices
        WHERE cmc_id = $1 AND timestamp >= $2
        ORDER BY timestamp ASC
        `,
        [cmcId, cutoffDate]
      );

      client.release();

      const cryptoInfo = await this.getCryptocurrencyBySymbol(symbol);

      return {
        metadata: {
          name: cryptoInfo.data.name,
          symbol: cryptoInfo.data.symbol,
          id: cryptoInfo.data.cmc_id,
        },
        data: pricesResult.rows,
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

    try {
      // Market cap statistics
      const totalMarketCap = data.reduce(
        (sum, crypto) => sum + (crypto.market_cap || 0),
        0
      );

      // Volume statistics
      const totalVolume = data.reduce(
        (sum, crypto) => sum + (crypto.volume_24h || 0),
        0
      );

      // Performance metrics
      const performanceStats = data.reduce(
        (stats, crypto) => {
          if (crypto.percent_change_24h > 0) stats.gainers24h++;
          if (crypto.percent_change_24h < 0) stats.losers24h++;
          if (crypto.percent_change_7d > 0) stats.gainers7d++;
          if (crypto.percent_change_7d < 0) stats.losers7d++;
          return stats;
        },
        { gainers24h: 0, losers24h: 0, gainers7d: 0, losers7d: 0 }
      );

      // Calculate top performers
      const sortedByChange24h = [...data].sort(
        (a, b) => (b.percent_change_24h || 0) - (a.percent_change_24h || 0)
      );
      const topGainers = sortedByChange24h.slice(0, 5);
      const topLosers = sortedByChange24h.slice(-5).reverse();

      // Calculate dominance of top 5 cryptocurrencies
      const top5MarketCap = data
        .slice(0, 5)
        .reduce((sum, crypto) => sum + (crypto.market_cap || 0), 0);
      const top5Dominance = (top5MarketCap / totalMarketCap) * 100;

      return {
        market_analysis: {
          total_market_cap: totalMarketCap,
          total_24h_volume: totalVolume,
          top5_dominance: parseFloat(top5Dominance.toFixed(2)),
          market_sentiment_24h:
            performanceStats.gainers24h > performanceStats.losers24h
              ? "bullish"
              : "bearish",
          market_sentiment_7d:
            performanceStats.gainers7d > performanceStats.losers7d
              ? "bullish"
              : "bearish",
        },
        performance: {
          gainers_24h: performanceStats.gainers24h,
          losers_24h: performanceStats.losers24h,
          gainers_7d: performanceStats.gainers7d,
          losers_7d: performanceStats.losers7d,
          gainers_to_losers_ratio_24h: parseFloat(
            (
              performanceStats.gainers24h / (performanceStats.losers24h || 1)
            ).toFixed(2)
          ),
        },
        top_gainers_24h: topGainers.map((crypto) => ({
          symbol: crypto.symbol,
          name: crypto.name,
          percent_change_24h: crypto.percent_change_24h,
        })),
        top_losers_24h: topLosers.map((crypto) => ({
          symbol: crypto.symbol,
          name: crypto.name,
          percent_change_24h: crypto.percent_change_24h,
        })),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("Error analyzing cryptocurrency data:", error);
      return { error: "Failed to analyze market data" };
    }
  }

  startUpdateScheduler() {
    // Update cryptocurrency data every 6 hours
    cron.schedule("0 */6 * * *", async () => {
      logger.info("Running scheduled cryptocurrency data update");
      await this.updateCryptocurrencyData();
    });
  }
}

module.exports = new CryptoListingsService();
