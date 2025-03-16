// repositories/cryptoSentimentRepository.js
const logger = require("../config/logger");

class CryptoSentimentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Save batch of sentiment data to database
   * @param {Array} data - Array of sentiment data objects
   * @returns {Promise<Number>} - Number of records inserted
   */
  async saveBatch(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return 0;
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      let insertCount = 0;
      for (const item of data) {
        try {
          const result = await client.query(
            `INSERT INTO crypto_sentiment (timestamp, value, value_classification) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (timestamp) DO NOTHING
             RETURNING id`,
            [item.timestamp, item.value, item.value_classification]
          );

          if (result.rows.length > 0) {
            insertCount++;
          }
        } catch (err) {
          logger.warn(
            `Failed to insert sentiment data for timestamp ${item.timestamp}:`,
            err
          );
        }
      }

      await client.query("COMMIT");
      return insertCount;
    } catch (err) {
      await client.query("ROLLBACK");
      logger.error("Error saving batch sentiment data:", err);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update the last update tracking record
   * @param {String} endpoint - API endpoint name
   * @param {Date} nextUpdateAt - When to perform the next update
   * @returns {Promise<void>}
   */
  async updateLastUpdated(endpoint, nextUpdateAt) {
    try {
      await this.pool.query(
        `INSERT INTO crypto_sentiment_last_update (endpoint, last_updated_at, next_update_at) 
         VALUES ($1, NOW(), $2)
         ON CONFLICT (endpoint) DO UPDATE 
         SET last_updated_at = NOW(), next_update_at = $2`,
        [endpoint, nextUpdateAt]
      );
    } catch (err) {
      logger.error(`Error updating last_updated for ${endpoint}:`, err);
      throw err;
    }
  }

  /**
   * Check if it's time to update data from API
   * @param {String} endpoint - API endpoint name
   * @returns {Promise<Boolean>} - True if update is needed
   */
  async shouldUpdate(endpoint) {
    try {
      const result = await this.pool.query(
        `SELECT next_update_at FROM crypto_sentiment_last_update 
         WHERE endpoint = $1`,
        [endpoint]
      );

      if (result.rows.length === 0) {
        return true; // No record, first time
      }

      const nextUpdateAt = new Date(result.rows[0].next_update_at);
      return new Date() >= nextUpdateAt;
    } catch (err) {
      logger.error(`Error checking update status for ${endpoint}:`, err);
      return true; // Default to updating if error occurs
    }
  }

  /**
   * Get the latest sentiment data from the database
   * @returns {Promise<Object>} - Latest sentiment data
   */
  async getLatest() {
    try {
      const result = await this.pool.query(
        `SELECT timestamp, value, value_classification, created_at
         FROM crypto_sentiment
         ORDER BY timestamp DESC
         LIMIT 1`
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      logger.error("Error fetching latest sentiment data:", err);
      throw err;
    }
  }

  /**
   * Get historical sentiment data
   * @param {Number} days - Number of days to retrieve
   * @returns {Promise<Array>} - Historical sentiment data
   */
  async getHistoricalData(days = 10) {
    try {
      const result = await this.pool.query(
        `SELECT timestamp, value, value_classification
         FROM crypto_sentiment
         WHERE timestamp >= extract(epoch from (NOW() - INTERVAL '${days} days'))
         ORDER BY timestamp DESC`
      );

      return result.rows;
    } catch (err) {
      logger.error(
        `Error fetching ${days} days of historical sentiment data:`,
        err
      );
      throw err;
    }
  }
}

module.exports = CryptoSentimentRepository;
