// repositories/feedbackRepository.js
const logger = require("../config/logger");
const { FEEDBACK } = require("../constants/logMessages");

class FeedbackRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async create(feedback) {
    try {
      const { userId, feedbackType, content, rating, source } = feedback;

      const result = await this.pool.query(
        `INSERT INTO feedback 
         (user_id, feedback_type, content, rating, source) 
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, feedback_type, content, rating, source, status, created_at`,
        [userId || null, feedbackType, content, rating || null, source || null]
      );

      logger.info(FEEDBACK.CREATE_SUCCESS);
      return result.rows[0];
    } catch (error) {
      logger.error(FEEDBACK.CREATE_ERROR, error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id, 
          user_id,
          feedback_type, 
          content, 
          rating, 
          source,
          status, 
          created_at, 
          updated_at
         FROM feedback 
         WHERE id = $1`,
        [id]
      );
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error(FEEDBACK.GET_ERROR(id), error);
      throw error;
    }
  }

  async getAll(filters = {}) {
    try {
      const { status, feedbackType, userId, limit = 100, offset = 0 } = filters;

      let queryParams = [];
      let whereConditions = [];
      let paramIndex = 1;

      if (status) {
        whereConditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (feedbackType) {
        whereConditions.push(`feedback_type = $${paramIndex++}`);
        queryParams.push(feedbackType);
      }

      if (userId) {
        whereConditions.push(`user_id = $${paramIndex++}`);
        queryParams.push(userId);
      }

      let whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      queryParams.push(limit, offset);

      const result = await this.pool.query(
        `SELECT 
          id, 
          user_id,
          feedback_type, 
          content, 
          rating, 
          source,
          status, 
          created_at, 
          updated_at
         FROM feedback 
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        queryParams
      );

      return result.rows;
    } catch (error) {
      logger.error(FEEDBACK.GET_ALL_ERROR, error);
      throw error;
    }
  }

  async update(id, updates) {
    try {
      const allowedUpdates = ["status", "feedback_type", "content", "rating"];
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
        `UPDATE feedback 
         SET ${updateFields.join(", ")} 
         WHERE id = $1
         RETURNING id, feedback_type, content, rating, source, status, updated_at`,
        queryParams
      );

      if (result.rows.length > 0) {
        logger.info(FEEDBACK.UPDATE_SUCCESS(id));
        return result.rows[0];
      }
      return null;
    } catch (error) {
      logger.error(FEEDBACK.UPDATE_ERROR(id), error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.pool.query(
        `DELETE FROM feedback WHERE id = $1 RETURNING id`,
        [id]
      );

      if (result.rowCount > 0) {
        logger.info(FEEDBACK.DELETE_SUCCESS(id));
        return true;
      }
      return false;
    } catch (error) {
      logger.error(FEEDBACK.DELETE_ERROR(id), error);
      throw error;
    }
  }
}

module.exports = FeedbackRepository;
