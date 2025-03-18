// repositories/altcoinSeasonRepository.js
const logger = require("../config/logger");

class AltcoinSeasonRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveBatch(altcoinSeasonData) {
    let insertedCount = 0;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      for (const item of altcoinSeasonData) {
        const { timestamp, altcoinIndex, altcoinMarketcap } = item;

        // Convert timestamp to Date object
        const timestampDate = new Date(parseInt(timestamp) * 1000);

        const result = await client.query(
          `INSERT INTO altcoin_season_index 
           (timestamp, altcoin_index, altcoin_marketcap) 
           VALUES ($1, $2, $3)
           ON CONFLICT (timestamp) DO NOTHING
           RETURNING id`,
          [
            timestampDate,
            parseFloat(altcoinIndex),
            parseFloat(altcoinMarketcap),
          ]
        );

        if (result.rowCount > 0) {
          insertedCount++;
        }
      }

      await client.query("COMMIT");
      return insertedCount;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Error saving batch altcoin season index data:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getHistoricalData(days = 30) {
    try {
      const result = await this.pool.query(
        `SELECT 
          timestamp, 
          altcoin_index, 
          altcoin_marketcap
         FROM altcoin_season_index 
         WHERE timestamp >= NOW() - INTERVAL '${days} days'
         ORDER BY timestamp ASC`
      );
      return result.rows;
    } catch (error) {
      logger.error("Error fetching historical altcoin season data:", error);
      throw error;
    }
  }

  async getLatest() {
    try {
      const result = await this.pool.query(
        `SELECT 
          timestamp, 
          altcoin_index, 
          altcoin_marketcap
         FROM altcoin_season_index 
         ORDER BY timestamp DESC 
         LIMIT 1`
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error("Error fetching latest altcoin season index data:", error);
      throw error;
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
      logger.error("Error checking update time for altcoin season:", error);
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
      logger.error(
        "Error updating last_update record for altcoin season:",
        error
      );
      throw error;
    }
  }
}

module.exports = AltcoinSeasonRepository;
