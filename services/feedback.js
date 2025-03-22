const logger = require("../config/logger");
const { pool } = require("../db");
const FeedbackRepository = require("../repositories/feedbackRepository");
const { createFeedbackTable } = require("../db/schemas/feedback");

class FeedbackService {
  constructor() {
    this.repository = new FeedbackRepository(pool);
  }

  async initializeDatabase() {
    try {
      await createFeedbackTable(pool);
      logger.info("Feedback tables initialized");
      return true;
    } catch (error) {
      logger.error("Failed to initialize feedback tables:", error);
      return false;
    }
  }

  async createFeedback(feedbackData) {
    try {
      const { userId, feedbackType, content, rating, source } = feedbackData;

      if (!feedbackType || !content) {
        throw new Error("Feedback type and content are required");
      }

      if (
        rating !== undefined &&
        (rating < 1 || rating > 5 || !Number.isInteger(rating))
      ) {
        throw new Error("Rating must be an integer between 1 and 5");
      }

      const feedbackRecord = await this.repository.create({
        userId,
        feedbackType,
        content,
        rating,
        source,
      });

      return {
        status: "success",
        data: feedbackRecord,
      };
    } catch (error) {
      logger.error("Error creating feedback:", error);
      throw error;
    }
  }

  async getFeedback(id) {
    try {
      const feedback = await this.repository.getById(id);

      if (!feedback) {
        return {
          status: "error",
          message: `Feedback with ID ${id} not found`,
        };
      }

      return {
        status: "success",
        data: feedback,
      };
    } catch (error) {
      logger.error(`Error getting feedback with ID ${id}:`, error);
      throw error;
    }
  }

  async getAllFeedback(filters) {
    try {
      const feedbackList = await this.repository.getAll(filters);

      return {
        status: "success",
        count: feedbackList.length,
        data: feedbackList,
      };
    } catch (error) {
      logger.error("Error getting all feedback:", error);
      throw error;
    }
  }

  async updateFeedback(id, updates) {
    try {
      if (
        updates.rating !== undefined &&
        (updates.rating < 1 ||
          updates.rating > 5 ||
          !Number.isInteger(updates.rating))
      ) {
        throw new Error("Rating must be an integer between 1 and 5");
      }

      const updatedFeedback = await this.repository.update(id, updates);

      if (!updatedFeedback) {
        return {
          status: "error",
          message: `Feedback with ID ${id} not found or no valid updates provided`,
        };
      }

      return {
        status: "success",
        data: updatedFeedback,
      };
    } catch (error) {
      logger.error(`Error updating feedback with ID ${id}:`, error);
      throw error;
    }
  }

  async deleteFeedback(id) {
    try {
      const deleted = await this.repository.delete(id);

      if (!deleted) {
        return {
          status: "error",
          message: `Feedback with ID ${id} not found`,
        };
      }

      return {
        status: "success",
        message: `Feedback with ID ${id} deleted successfully`,
      };
    } catch (error) {
      logger.error(`Error deleting feedback with ID ${id}:`, error);
      throw error;
    }
  }
}

module.exports = new FeedbackService();
