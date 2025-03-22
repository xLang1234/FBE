// repositories/altcoinSeasonRepository.js
const logger = require("../config/logger");
const { DATA, ERROR } = require("../constants/logMessages");

class AltcoinSeasonRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async saveBatch(altcoinSeasonData) {
    let insertedCount = 0;
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      logger.debug(DATA.PROCESSING_BATCH(altcoinSeasonData.length));
      logger.info(
        DATA.SAVING_RECORDS(altcoinSeasonData.length, "altcoin season index")
      );

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
      logger.info(DATA.UPDATE_COMPLETE("altcoin season index", insertedCount));
      return insertedCount;
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(ERROR.DATABASE, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getHistoricalData(days = 30) {
    try {
      logger.debug(DATA.FETCHING("historical altcoin season"));

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
      logger.error(ERROR.DATABASE, error);
      throw error;
    }
  }

  async getLatest() {
    try {
      logger.debug(DATA.FETCHING("latest altcoin season index"));

      const result = await this.pool.query(
        `SELECT 
          timestamp, 
          altcoin_index, 
          altcoin_marketcap
         FROM altcoin_season_index 
         ORDER BY timestamp DESC 
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        logger.warn(DATA.NO_ITEMS);
      }

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(ERROR.DATABASE, error);
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
      const shouldUpdate = new Date() >= new Date(nextUpdate);

      if (!shouldUpdate) {
        logger.info(DATA.UPDATE_SKIPPED("altcoin season index"));
      }

      return shouldUpdate;
    } catch (error) {
      logger.error(ERROR.DATABASE, error);
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

      logger.info(`Next ${updateType} update scheduled for ${nextUpdate}`);
      return true;
    } catch (error) {
      logger.error(ERROR.DATABASE, error);
      throw error;
    }
  }
}

module.exports = AltcoinSeasonRepository;
