// repositories/rawContentRepository.js
const logger = require("../config/logger");

class RawContentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(rawContent) {
    try {
      const {
        entityId,
        externalId,
        contentType,
        content,
        publishedAt,
        engagementMetrics,
        rawData,
      } = rawContent;

      const result = await this.pool.query(
        `INSERT INTO raw_content 
         (entity_id, external_id, content_type, content, published_at, engagement_metrics, raw_data) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, entity_id, external_id, content_type, content, published_at, collected_at`,
        [
          entityId,
          externalId,
          contentType,
          content,
          publishedAt,
          engagementMetrics ? JSON.stringify(engagementMetrics) : null,
          rawData ? JSON.stringify(rawData) : null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating raw content:", error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          entity_id,
          external_id, 
          content_type, 
          content, 
          published_at, 
          collected_at, 
          engagement_metrics, 
          raw_data
         FROM raw_content 
         WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error getting raw content with id ${id}:`, error);
      throw error;
    }
  }

  async getByExternalId(entityId, externalId) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          entity_id,
          external_id, 
          content_type, 
          content, 
          published_at, 
          collected_at, 
          engagement_metrics, 
          raw_data
         FROM raw_content 
         WHERE entity_id = $1 AND external_id = $2`,
        [entityId, externalId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(
        `Error getting raw content with external id ${externalId}:`,
        error
      );
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const {
        entityId,
        contentType,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = filters;

      let queryParams = [];
      let whereConditions = [];
      let paramIndex = 1;

      if (entityId) {
        whereConditions.push(`entity_id = $${paramIndex++}`);
        queryParams.push(entityId);
      }

      if (contentType) {
        whereConditions.push(`content_type = $${paramIndex++}`);
        queryParams.push(contentType);
      }

      if (startDate) {
        whereConditions.push(`published_at >= $${paramIndex++}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`published_at <= $${paramIndex++}`);
        queryParams.push(endDate);
      }

      let whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      queryParams.push(limit, offset);

      const result = await this.pool.query(
        `SELECT 
          id, 
          entity_id,
          external_id, 
          content_type, 
          content, 
          published_at, 
          collected_at, 
          engagement_metrics, 
          raw_data
         FROM raw_content 
         ${whereClause}
         ORDER BY published_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      return result.rows;
    } catch (error) {
      logger.error("Error getting all raw content:", error);
      throw error;
    }
  }

  async getUnprocessed(limit = 100) {
    try {
      const result = await this.pool.query(
        `SELECT 
          r.id, 
          r.entity_id,
          r.external_id, 
          r.content_type, 
          r.content, 
          r.published_at, 
          r.collected_at, 
          r.engagement_metrics
         FROM raw_content r
         LEFT JOIN processed_content p ON r.id = p.raw_content_id
         WHERE p.id IS NULL
         ORDER BY r.published_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      logger.error("Error getting unprocessed content:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.pool.query(
        `DELETE FROM raw_content WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting raw content with id ${id}:`, error);
      throw error;
    }
  }
}

module.exports = RawContentRepository;
