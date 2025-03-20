// repositories/entityRepository.js
const logger = require("../config/logger");

class EntityRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(entity) {
    try {
      const {
        sourceId,
        entityExternalId,
        name,
        username,
        description,
        followersCount,
        relevanceScore,
        isActive,
      } = entity;

      const result = await this.pool.query(
        `INSERT INTO entities 
         (source_id, entity_external_id, name, username, description, followers_count, relevance_score, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, source_id, entity_external_id, name, username, description, followers_count, relevance_score, is_active, created_at`,
        [
          sourceId,
          entityExternalId,
          name,
          username || null,
          description || null,
          followersCount || null,
          relevanceScore || null,
          isActive !== undefined ? isActive : true,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating entity:", error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          source_id,
          entity_external_id, 
          name, 
          username, 
          description, 
          followers_count, 
          relevance_score,
          is_active, 
          created_at, 
          updated_at
         FROM entities 
         WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error getting entity with id ${id}:`, error);
      throw error;
    }
  }

  async getByExternalId(sourceId, externalId) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          source_id,
          entity_external_id, 
          name, 
          username, 
          description, 
          followers_count, 
          relevance_score,
          is_active, 
          created_at, 
          updated_at
         FROM entities 
         WHERE source_id = $1 AND entity_external_id = $2`,
        [sourceId, externalId]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(
        `Error getting entity with external id ${externalId}:`,
        error
      );
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const {
        sourceId,
        isActive,
        username,
        minFollowers,
        minRelevance,
        limit = 100,
        offset = 0,
      } = filters;

      let queryParams = [];
      let whereConditions = [];
      let paramIndex = 1;

      if (sourceId) {
        whereConditions.push(`source_id = $${paramIndex++}`);
        queryParams.push(sourceId);
      }

      if (isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(isActive);
      }

      if (username) {
        whereConditions.push(`username = $${paramIndex++}`);
        queryParams.push(username);
      }

      if (minFollowers) {
        whereConditions.push(`followers_count >= $${paramIndex++}`);
        queryParams.push(minFollowers);
      }

      if (minRelevance) {
        whereConditions.push(`relevance_score >= $${paramIndex++}`);
        queryParams.push(minRelevance);
      }

      let whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      queryParams.push(limit, offset);

      const result = await this.pool.query(
        `SELECT 
          id, 
          source_id,
          entity_external_id, 
          name, 
          username, 
          description, 
          followers_count, 
          relevance_score,
          is_active, 
          created_at, 
          updated_at
         FROM entities 
         ${whereClause}
         ORDER BY relevance_score DESC, followers_count DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      return result.rows;
    } catch (error) {
      logger.error("Error getting all entities:", error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const allowedUpdates = [
        "name",
        "username",
        "description",
        "followers_count",
        "relevance_score",
        "is_active",
      ];

      const updateFields = [];
      const queryParams = [id];
      let paramIndex = 2;

      // Build dynamic update query based on provided fields
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key) && value !== undefined) {
          updateFields.push(
            `${key.replace(/([A-Z])/g, "_$1").toLowerCase()} = $${paramIndex++}`
          );
          queryParams.push(value);
        }
      }

      // Always update updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      if (updateFields.length === 1) {
        // Only updated_at was added, nothing else to update
        return null;
      }

      const result = await this.pool.query(
        `UPDATE entities 
         SET ${updateFields.join(", ")} 
         WHERE id = $1
         RETURNING id, name, username, description, followers_count, relevance_score, is_active, updated_at`,
        queryParams
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error updating entity with id ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.pool.query(
        `DELETE FROM entities WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting entity with id ${id}:`, error);
      throw error;
    }
  }

  async getActiveEntitiesBySourceType(sourceType) {
    try {
      const result = await this.pool.query(
        `SELECT 
          e.id, 
          e.source_id,
          e.entity_external_id, 
          e.name, 
          e.username, 
          e.description, 
          e.followers_count, 
          e.relevance_score,
          e.is_active, 
          e.created_at, 
          e.updated_at
         FROM entities e
         JOIN sources s ON e.source_id = s.id
         WHERE s.type = $1 AND e.is_active = true AND s.is_active = true
         ORDER BY e.relevance_score DESC`,
        [sourceType]
      );
      return result.rows;
    } catch (error) {
      logger.error(
        `Error getting active entities for source type ${sourceType}:`,
        error
      );
      throw error;
    }
  }
}

module.exports = EntityRepository;
