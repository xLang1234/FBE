// repositories/sourceRepository.js
const logger = require("../config/logger");

class SourceRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(source) {
    try {
      const { name, type, apiEndpoint, credentialsId, isActive } = source;

      const result = await this.pool.query(
        `INSERT INTO sources 
         (name, type, api_endpoint, credentials_id, is_active) 
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, name, type, api_endpoint, credentials_id, is_active, created_at`,
        [
          name,
          type,
          apiEndpoint || null,
          credentialsId || null,
          isActive !== undefined ? isActive : true,
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating source:", error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          name,
          type, 
          api_endpoint, 
          credentials_id, 
          is_active,
          created_at, 
          updated_at
         FROM sources 
         WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error getting source with id ${id}:`, error);
      throw error;
    }
  }

  async getByType(type) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          name,
          type, 
          api_endpoint, 
          credentials_id, 
          is_active,
          created_at, 
          updated_at
         FROM sources 
         WHERE type = $1`,
        [type]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error getting source with type ${type}:`, error);
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const { type, isActive, limit = 100, offset = 0 } = filters;

      let queryParams = [];
      let whereConditions = [];
      let paramIndex = 1;

      if (type) {
        whereConditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }

      if (isActive !== undefined) {
        whereConditions.push(`is_active = $${paramIndex++}`);
        queryParams.push(isActive);
      }

      let whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      queryParams.push(limit, offset);

      const result = await this.pool.query(
        `SELECT 
          id, 
          name,
          type, 
          api_endpoint, 
          credentials_id, 
          is_active,
          created_at, 
          updated_at
         FROM sources 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      return result.rows;
    } catch (error) {
      logger.error("Error getting all sources:", error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const allowedUpdates = [
        "name",
        "type",
        "api_endpoint",
        "credentials_id",
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
        `UPDATE sources 
         SET ${updateFields.join(", ")} 
         WHERE id = $1
         RETURNING id, name, type, api_endpoint, credentials_id, is_active, updated_at`,
        queryParams
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(`Error updating source with id ${id}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.pool.query(
        `DELETE FROM sources WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      logger.error(`Error deleting source with id ${id}:`, error);
      throw error;
    }
  }
}

module.exports = SourceRepository;
