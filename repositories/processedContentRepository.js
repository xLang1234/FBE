// repositories/processedContentRepository.js
const logger = require("../config/logger");

class ProcessedContentRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(processedContent) {
    try {
      const {
        rawContentId,
        sentimentScore,
        impactScore,
        categories,
        keywords,
        entitiesMentioned,
        summary,
      } = processedContent;

      const result = await this.pool.query(
        `INSERT INTO processed_content 
         (raw_content_id, sentiment_score, impact_score, categories, keywords, entities_mentioned, summary) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, raw_content_id, sentiment_score, impact_score, categories, keywords, entities_mentioned, summary, processed_at`,
        [
          rawContentId,
          sentimentScore || null,
          impactScore || null,
          categories || null,
          keywords || null,
          entitiesMentioned || null,
          summary || null,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating processed content:", error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          raw_content_id,
          sentiment_score, 
          impact_score, 
          categories, 
          keywords, 
          entities_mentioned, 
          summary, 
          processed_at
         FROM processed_content 
         WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error getting processed content with id ${id}:`, error);
      throw error;
    }
  }

  async getByRawContentId(rawContentId) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          raw_content_id,
          sentiment_score, 
          impact_score, 
          categories, 
          keywords, 
          entities_mentioned, 
          summary, 
          processed_at
         FROM processed_content 
         WHERE raw_content_id = $1`,
        [rawContentId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(
        `Error getting processed content for raw content id ${rawContentId}:`,
        error
      );
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const {
        minSentiment,
        maxSentiment,
        minImpact,
        category,
        keyword,
        entityMentioned,
        limit = 100,
        offset = 0,
      } = filters;

      let queryParams = [];
      let whereConditions = [];
      let paramIndex = 1;

      if (minSentiment !== undefined) {
        whereConditions.push(`sentiment_score >= $${paramIndex++}`);
        queryParams.push(minSentiment);
      }

      if (maxSentiment !== undefined) {
        whereConditions.push(`sentiment_score <= $${paramIndex++}`);
        queryParams.push(maxSentiment);
      }

      if (minImpact !== undefined) {
        whereConditions.push(`impact_score >= $${paramIndex++}`);
        queryParams.push(minImpact);
      }

      if (category) {
        whereConditions.push(`$${paramIndex++} = ANY(categories)`);
        queryParams.push(category);
      }

      if (keyword) {
        whereConditions.push(`$${paramIndex++} = ANY(keywords)`);
        queryParams.push(keyword);
      }

      if (entityMentioned) {
        whereConditions.push(`$${paramIndex++} = ANY(entities_mentioned)`);
        queryParams.push(entityMentioned);
      }

      let whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      queryParams.push(limit, offset);

      const result = await this.pool.query(
        `SELECT 
          id, 
          raw_content_id,
          sentiment_score, 
          impact_score, 
          categories, 
          keywords, 
          entities_mentioned, 
          summary, 
          processed_at
         FROM processed_content 
         ${whereClause}
         ORDER BY processed_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      return result.rows;
    } catch (error) {
      logger.error("Error getting all processed content:", error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.pool.query(
        `DELETE FROM processed_content WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting processed content with id ${id}:`, error);
      throw error;
    }
  }

  async getContentWithMetrics(filters = {}) {
    try {
      const {
        entityId,
        contentType,
        startDate,
        endDate,
        minSentiment,
        minImpact,
        category,
        limit = 100,
        offset = 0,
      } = filters;

      let queryParams = [];
      let whereConditions = [];
      let paramIndex = 1;

      if (entityId) {
        whereConditions.push(`r.entity_id = $${paramIndex++}`);
        queryParams.push(entityId);
      }

      if (contentType) {
        whereConditions.push(`r.content_type = $${paramIndex++}`);
        queryParams.push(contentType);
      }

      if (startDate) {
        whereConditions.push(`r.published_at >= $${paramIndex++}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`r.published_at <= $${paramIndex++}`);
        queryParams.push(endDate);
      }

      if (minSentiment !== undefined) {
        whereConditions.push(`p.sentiment_score >= $${paramIndex++}`);
        queryParams.push(minSentiment);
      }

      if (minImpact !== undefined) {
        whereConditions.push(`p.impact_score >= $${paramIndex++}`);
        queryParams.push(minImpact);
      }

      if (category) {
        whereConditions.push(`$${paramIndex++} = ANY(p.categories)`);
        queryParams.push(category);
      }

      let whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      queryParams.push(limit, offset);

      const result = await this.pool.query(
        `SELECT 
          r.id as raw_id,
          r.entity_id,
          r.external_id, 
          r.content_type, 
          r.content, 
          r.published_at, 
          r.engagement_metrics,
          p.id as processed_id, 
          p.sentiment_score, 
          p.impact_score, 
          p.categories, 
          p.keywords, 
          p.entities_mentioned, 
          p.summary
         FROM raw_content r
         JOIN processed_content p ON r.id = p.raw_content_id
         ${whereClause}
         ORDER BY r.published_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      return result.rows;
    } catch (error) {
      logger.error("Error getting content with metrics:", error);
      throw error;
    }
  }
}

module.exports = ProcessedContentRepository;
