// repositories/cryptoListingsRepository.js
const logger = require("../config/logger");

class CryptoListingsRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveBatch(listings) {
    let insertedCryptos = 0;
    let insertedPrices = 0;
    let insertedTags = 0;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const item of listings) {
        const {
          id: cmc_id,
          name,
          symbol,
          slug,
          cmc_rank,
          num_market_pairs,
          circulating_supply,
          total_supply,
          max_supply,
          infinite_supply,
          last_updated,
          date_added,
          tags,
          quote,
        } = item;

        // 1. Insert or update cryptocurrency base data
        const cryptoResult = await client.query(
          `INSERT INTO cryptocurrencies 
           (cmc_id, name, symbol, slug, max_supply, infinite_supply, date_added, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (cmc_id) 
           DO UPDATE SET 
             name = $2,
             symbol = $3,
             slug = $4,
             max_supply = $5,
             infinite_supply = $6,
             updated_at = NOW()
           RETURNING cmc_id`,
          [
            cmc_id,
            name,
            symbol,
            slug,
            max_supply,
            infinite_supply,
            date_added ? new Date(date_added) : null,
          ]
        );

        if (cryptoResult.rowCount > 0) {
          insertedCryptos++;
        }

        // 2. Insert price data
        const timestamp = new Date(last_updated);
        const priceResult = await client.query(
          `INSERT INTO cryptocurrency_prices 
           (cmc_id, timestamp, price_usd, volume_24h, volume_change_24h, 
            percent_change_1h, percent_change_24h, percent_change_7d, 
            market_cap, market_cap_dominance, fully_diluted_market_cap,
            circulating_supply, total_supply, cmc_rank, num_market_pairs)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (cmc_id, timestamp) DO NOTHING
           RETURNING id`,
          [
            cmc_id,
            timestamp,
            quote.USD.price,
            quote.USD.volume_24h,
            quote.USD.volume_change_24h,
            quote.USD.percent_change_1h,
            quote.USD.percent_change_24h,
            quote.USD.percent_change_7d,
            quote.USD.market_cap,
            quote.USD.market_cap_dominance,
            quote.USD.fully_diluted_market_cap,
            circulating_supply,
            total_supply,
            cmc_rank,
            num_market_pairs,
          ]
        );

        if (priceResult.rowCount > 0) {
          insertedPrices++;
        }

        // 3. Insert tags
        if (tags && Array.isArray(tags)) {
          for (const tag of tags) {
            try {
              const tagResult = await client.query(
                `INSERT INTO cryptocurrency_tags 
                 (cmc_id, tag)
                 VALUES ($1, $2)
                 ON CONFLICT (cmc_id, tag) DO NOTHING
                 RETURNING id`,
                [cmc_id, tag]
              );

              if (tagResult.rowCount > 0) {
                insertedTags++;
              }
            } catch (tagError) {
              logger.warn(
                `Error inserting tag for ${symbol}: ${tagError.message}`
              );
              // Continue with the next tag
            }
          }
        }
      }

      await client.query("COMMIT");
      return { insertedCryptos, insertedPrices, insertedTags };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error saving batch cryptocurrency data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async shouldUpdate(updateType) {
    try {
      const result = await this.pool.query(
        `SELECT next_update_at FROM cryptocurrency_listings_last_update WHERE endpoint = $1`,
        [updateType]
      );

      if (result.rows.length === 0) {
        return true;
      }

      const nextUpdate = result.rows[0].next_update_at;
      return new Date() >= new Date(nextUpdate);
    } catch (error) {
      logger.error("Error checking update time:", error);
      return true; // On error, assume we should update
    }
  }

  async updateLastUpdated(updateType, nextUpdate) {
    try {
      await this.pool.query(
        `INSERT INTO cryptocurrency_listings_last_update (endpoint, last_updated_at, next_update_at)
         VALUES ($1, NOW(), $2)
         ON CONFLICT (endpoint) 
         DO UPDATE SET last_updated_at = NOW(), next_update_at = $2`,
        [updateType, nextUpdate]
      );
      return true;
    } catch (error) {
      logger.error("Error updating last_update record:", error);
      throw error;
    }
  }

  async getTopCryptocurrencies(limit = 10, offset = 0) {
    try {
      // Get the most recent timestamp
      const timestampResult = await this.pool.query(
        `SELECT MAX(timestamp) as latest_timestamp FROM cryptocurrency_prices`
      );

      const latestTimestamp = timestampResult.rows[0].latest_timestamp;

      if (!latestTimestamp) {
        return [];
      }

      // Get the top cryptocurrencies by market cap
      const result = await this.pool.query(
        `SELECT c.cmc_id, c.name, c.symbol, c.slug, p.price_usd, p.market_cap, 
                p.percent_change_24h, p.percent_change_7d, p.circulating_supply,
                p.cmc_rank, p.timestamp
         FROM cryptocurrencies c
         JOIN cryptocurrency_prices p ON c.cmc_id = p.cmc_id
         WHERE p.timestamp = $1
         ORDER BY p.market_cap DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        [latestTimestamp, limit, offset]
      );

      return result.rows;
    } catch (error) {
      logger.error("Error fetching top cryptocurrencies:", error);
      throw error;
    }
  }

  async getHistoricalPrices(cmc_id, days = 30) {
    try {
      const result = await this.pool.query(
        `SELECT timestamp, price_usd, volume_24h, market_cap, 
                percent_change_24h, percent_change_7d, cmc_rank
         FROM cryptocurrency_prices
         WHERE cmc_id = $1
         AND timestamp >= NOW() - INTERVAL '${days} days'
         ORDER BY timestamp ASC`,
        [cmc_id]
      );

      return result.rows;
    } catch (error) {
      logger.error(
        `Error fetching historical prices for cmc_id ${cmc_id}:`,
        error
      );
      throw error;
    }
  }

  async getCryptocurrencyBySymbol(symbol) {
    try {
      const result = await this.pool.query(
        `SELECT c.cmc_id, c.name, c.symbol, c.slug, c.max_supply, c.infinite_supply, c.date_added
         FROM cryptocurrencies c
         WHERE c.symbol = $1`,
        [symbol.toUpperCase()]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const crypto = result.rows[0];

      // Get the latest price data
      const priceResult = await this.pool.query(
        `SELECT p.timestamp, p.price_usd, p.volume_24h, p.market_cap, 
                p.percent_change_24h, p.percent_change_7d, p.cmc_rank,
                p.circulating_supply, p.total_supply
         FROM cryptocurrency_prices p
         WHERE p.cmc_id = $1
         ORDER BY p.timestamp DESC
         LIMIT 1`,
        [crypto.cmc_id]
      );

      if (priceResult.rows.length > 0) {
        crypto.price_data = priceResult.rows[0];
      }

      // Get tags
      const tagsResult = await this.pool.query(
        `SELECT tag FROM cryptocurrency_tags WHERE cmc_id = $1`,
        [crypto.cmc_id]
      );

      crypto.tags = tagsResult.rows.map((row) => row.tag);

      return crypto;
    } catch (error) {
      logger.error(`Error fetching cryptocurrency by symbol ${symbol}:`, error);
      throw error;
    }
  }
}

module.exports = CryptoListingsRepository;
