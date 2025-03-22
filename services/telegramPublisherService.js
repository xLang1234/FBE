// services/telegramPublisherService.js

const logger = require("../config/logger");
const { pool } = require("../db");
const telegramService = require("./telegram");

class TelegramPublisherService {
  constructor() {
    this.pollingInterval = null;
    this.lastPublishedId = 0;
    this.isRunning = false;
  }

  /**
   * Start the polling service
   * @param {number} intervalMs - Polling interval in milliseconds (default: 60000 ms = 1 minute)
   */
  startPolling(intervalMs = 60000) {
    if (this.isRunning) {
      logger.info("Telegram publisher is already running");
      return;
    }

    logger.info(
      `Starting Telegram publisher service with ${intervalMs}ms interval`
    );
    this.isRunning = true;

    // Initialize the last published ID
    this.initializeLastPublishedId()
      .then(() => {
        // Start the polling interval
        this.pollingInterval = setInterval(() => {
          this.checkAndPublishNewContent().catch((error) => {
            logger.error("Error in Telegram publisher polling:", error);
          });
        }, intervalMs);
      })
      .catch((error) => {
        logger.error("Failed to initialize Telegram publisher service:", error);
        this.isRunning = false;
      });
  }

  /**
   * Stop the polling service
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isRunning = false;
      logger.info("Telegram publisher service stopped");
    }
  }

  /**
   * Initialize the last published ID from the database or create tracking table if needed
   */
  async initializeLastPublishedId() {
    try {
      // Check if tracking table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'telegram_publishing_tracking'
        );
      `);

      const tableExists = tableCheck.rows[0].exists;

      if (!tableExists) {
        // Create tracking table
        await pool.query(`
          CREATE TABLE telegram_publishing_tracking (
            id SERIAL PRIMARY KEY,
            last_published_id INTEGER NOT NULL DEFAULT 0,
            last_check_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          INSERT INTO telegram_publishing_tracking (last_published_id, last_check_time) 
          VALUES (0, NOW());
        `);

        logger.info("Created telegram publishing tracking table");
        this.lastPublishedId = 0;
      } else {
        // Get the last published ID
        const result = await pool.query(`
          SELECT last_published_id FROM telegram_publishing_tracking 
          ORDER BY id DESC LIMIT 1;
        `);

        if (result.rows.length > 0) {
          this.lastPublishedId = result.rows[0].last_published_id;
          logger.info(`Initialized last published ID: ${this.lastPublishedId}`);
        }
      }
    } catch (error) {
      logger.error("Error initializing last published ID:", error);
      throw error;
    }
  }

  /**
   * Update the last published ID in the database
   * @param {number} id - The new last published ID
   */
  async updateLastPublishedId(id) {
    try {
      await pool.query(
        `
        UPDATE telegram_publishing_tracking 
        SET last_published_id = $1, last_check_time = NOW(), updated_at = NOW() 
        WHERE id = (SELECT id FROM telegram_publishing_tracking ORDER BY id DESC LIMIT 1);
      `,
        [id]
      );

      this.lastPublishedId = id;
      logger.debug(`Updated last published ID to ${id}`);
    } catch (error) {
      logger.error(`Error updating last published ID to ${id}:`, error);
      throw error;
    }
  }

  /**
   * Format content for Telegram message
   * @param {Object} content - The content object
   * @param {Object} entity - The entity object
   * @returns {string} - Formatted message
   */
  formatMessage(content, entity) {
    const publishedDate = new Date(content.published_at).toLocaleDateString();
    let message = `<b>${entity.name}</b> ${entity.username ? `(@${entity.username})` : ""}\n\n`;

    // Add summary if available
    if (content.summary) {
      message += `<b>Summary:</b> ${content.summary}\n\n`;
    } else {
      // Use a truncated version of the original content if no summary
      const truncatedContent =
        content.content.length > 200
          ? content.content.substring(0, 200) + "..."
          : content.content;
      message += `${truncatedContent}\n\n`;
    }

    // Add metadata and analytics
    message += `<b>Published:</b> ${publishedDate}\n`;

    if (content.sentiment_score !== null) {
      const sentimentLabel = this.getSentimentLabel(content.sentiment_score);
      message += `<b>Sentiment:</b> ${sentimentLabel} (${content.sentiment_score.toFixed(2)})\n`;
    }

    if (content.impact_score !== null) {
      message += `<b>Impact Score:</b> ${content.impact_score.toFixed(2)}\n`;
    }

    if (content.categories && content.categories.length > 0) {
      message += `<b>Categories:</b> ${content.categories.join(", ")}\n`;
    }

    if (content.keywords && content.keywords.length > 0) {
      message += `<b>Keywords:</b> ${content.keywords.join(", ")}\n`;
    }

    return message;
  }

  /**
   * Get a label for sentiment score
   * @param {number} score - Sentiment score (typically -1 to 1)
   * @returns {string} - Sentiment label
   */
  getSentimentLabel(score) {
    if (score >= 0.7) return "Very Positive";
    if (score >= 0.3) return "Positive";
    if (score >= -0.3) return "Neutral";
    if (score >= -0.7) return "Negative";
    return "Very Negative";
  }

  /**
   * Check for new content and publish to Telegram
   */
  async checkAndPublishNewContent() {
    try {
      logger.debug("Checking for new processed content...");

      // Update the check time even if we don't publish anything
      await pool.query(`
        UPDATE telegram_publishing_tracking 
        SET last_check_time = NOW() 
        WHERE id = (SELECT id FROM telegram_publishing_tracking ORDER BY id DESC LIMIT 1);
      `);

      // Get new processed content with entity information
      const result = await pool.query(
        `
        SELECT 
          pc.id, 
          pc.raw_content_id,
          pc.sentiment_score,
          pc.impact_score, 
          pc.categories,
          pc.keywords,
          pc.summary,
          rc.external_id,
          rc.content,
          rc.entity_id,
          rc.published_at,
          rc.content_type,
          e.name AS entity_name,
          e.username AS entity_username,
          e.description AS entity_description,
          s.name AS source_name,
          s.type AS source_type
        FROM processed_content pc
        JOIN raw_content rc ON pc.raw_content_id = rc.id
        JOIN entities e ON rc.entity_id = e.id
        JOIN sources s ON e.source_id = s.id
        WHERE pc.id > $1
        ORDER BY pc.id ASC
        LIMIT 10;
      `,
        [this.lastPublishedId]
      );

      if (result.rows.length === 0) {
        logger.debug("No new content found for publishing");
        return;
      }

      logger.info(`Found ${result.rows.length} new content items to publish`);

      let successCount = 0;
      let lastPublishedId = this.lastPublishedId;

      // Publish each content item
      for (const row of result.rows) {
        try {
          const entity = {
            name: row.entity_name,
            username: row.entity_username,
            description: row.entity_description,
          };

          const content = {
            id: row.id,
            raw_content_id: row.raw_content_id,
            external_id: row.external_id,
            content: row.content,
            published_at: row.published_at,
            content_type: row.content_type,
            sentiment_score: row.sentiment_score,
            impact_score: row.impact_score,
            categories: row.categories,
            keywords: row.keywords,
            summary: row.summary,
          };

          // Format message for Telegram
          const message = this.formatMessage(content, entity);

          // Broadcast message to all registered Telegram chats
          const broadcastResult =
            await telegramService.broadcastMessage(message);

          if (broadcastResult.success > 0) {
            successCount++;
            lastPublishedId = row.id;
            logger.info(
              `Published content ID ${row.id} to ${broadcastResult.success} chats`
            );
          } else {
            logger.warn(`Failed to publish content ID ${row.id} to any chat`);
          }
        } catch (error) {
          logger.error(`Error publishing content ID ${row.id}:`, error);
        }
      }

      // Update the last published ID if we successfully published anything
      if (successCount > 0) {
        await this.updateLastPublishedId(lastPublishedId);
        logger.info(`Published ${successCount} content items to Telegram`);
      }
    } catch (error) {
      logger.error("Error checking and publishing content:", error);
      throw error;
    }
  }

  /**
   * Force publish a specific content item
   * @param {number} contentId - The processed content ID to publish
   */
  async forcePublishContent(contentId) {
    try {
      // Get the content item
      const result = await pool.query(
        `
        SELECT 
          pc.id, 
          pc.raw_content_id,
          pc.sentiment_score,
          pc.impact_score, 
          pc.categories,
          pc.keywords,
          pc.summary,
          rc.external_id,
          rc.content,
          rc.entity_id,
          rc.published_at,
          rc.content_type,
          e.name AS entity_name,
          e.username AS entity_username,
          e.description AS entity_description,
          s.name AS source_name,
          s.type AS source_type
        FROM processed_content pc
        JOIN raw_content rc ON pc.raw_content_id = rc.id
        JOIN entities e ON rc.entity_id = e.id
        JOIN sources s ON e.source_id = s.id
        WHERE pc.id = $1;
      `,
        [contentId]
      );

      if (result.rows.length === 0) {
        logger.warn(`Content ID ${contentId} not found`);
        return false;
      }

      const row = result.rows[0];

      const entity = {
        name: row.entity_name,
        username: row.entity_username,
        description: row.entity_description,
      };

      const content = {
        id: row.id,
        raw_content_id: row.raw_content_id,
        external_id: row.external_id,
        content: row.content,
        published_at: row.published_at,
        content_type: row.content_type,
        sentiment_score: row.sentiment_score,
        impact_score: row.impact_score,
        categories: row.categories,
        keywords: row.keywords,
        summary: row.summary,
      };

      // Format message for Telegram
      const message = this.formatMessage(content, entity);

      // Broadcast message to all registered Telegram chats
      const broadcastResult = await telegramService.broadcastMessage(message);

      if (broadcastResult.success > 0) {
        // Update last published ID if this is newer
        if (row.id > this.lastPublishedId) {
          await this.updateLastPublishedId(row.id);
        }

        logger.info(
          `Force published content ID ${row.id} to ${broadcastResult.success} chats`
        );
        return true;
      } else {
        logger.warn(`Failed to force publish content ID ${row.id} to any chat`);
        return false;
      }
    } catch (error) {
      logger.error(`Error force publishing content ID ${contentId}:`, error);
      return false;
    }
  }
}

// Create and export a singleton instance
const telegramPublisherService = new TelegramPublisherService();
module.exports = telegramPublisherService;
