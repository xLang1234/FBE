// repositories/cryptoSentimentRepository.js
const logger = require("../config/logger");
const { SENTIMENT } = require("../constants/logMessages");

class FearAndGreedIndexRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveBatch(sentiments) {
    let insertedCount = 0;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const item of sentiments) {
        const { timestamp, value, value_classification } = item;

        // Convert timestamp to Date object
        const timestampDate = new Date(timestamp * 1000);

        const result = await client.query(
          `INSERT INTO fear_and_greed_index 
           (timestamp, value, value_classification) 
           VALUES ($1, $2, $3)
           ON CONFLICT (timestamp) DO NOTHING
           RETURNING id`,
          [timestampDate, value, value_classification]
        );

        if (result.rowCount > 0) {
          insertedCount++;
        }
      }

      await client.query("COMMIT");
      return insertedCount;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(SENTIMENT.BATCH_SAVE_ERROR, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async shouldUpdate(updateType) {
    try {
      const result = await this.pool.query(
        `SELECT next_update FROM last_update WHERE update_type = $1`,
        [updateType]
      );

      if (result.rows.length === 0) {
        return true;
      }

      const nextUpdate = result.rows[0].next_update;
      return new Date() >= new Date(nextUpdate);
    } catch (error) {
      logger.error(SENTIMENT.UPDATE_CHECK_ERROR, error);
      return true; // On error, assume we should update
    }
  }

  async updateLastUpdated(updateType, nextUpdate) {
    try {
      await this.pool.query(
        `INSERT INTO last_update (update_type, last_updated, next_update)
         VALUES ($1, NOW(), $2)
         ON CONFLICT (update_type) 
         DO UPDATE SET last_updated = NOW(), next_update = $2`,
        [updateType, nextUpdate]
      );
      return true;
    } catch (error) {
      logger.error(SENTIMENT.LAST_UPDATE_ERROR, error);
      throw error;
    }
  }

  async getHistoricalData(days = 10) {
    try {
      const result = await this.pool.query(
        `SELECT 
          timestamp, 
          value, 
          value_classification
         FROM fear_and_greed_index 
         WHERE timestamp >= NOW() - INTERVAL '${days} days'
         ORDER BY timestamp ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error(SENTIMENT.HISTORICAL_DATA_ERROR, error);
      throw error;
    }
  }

  async getLatest() {
    try {
      const result = await this.pool.query(
        `SELECT 
          timestamp, 
          value, 
          value_classification
         FROM fear_and_greed_index 
         ORDER BY timestamp DESC 
         LIMIT 1`
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(SENTIMENT.LATEST_DATA_ERROR, error);
      throw error;
    }
  }
}

module.exports = FearAndGreedIndexRepository;
