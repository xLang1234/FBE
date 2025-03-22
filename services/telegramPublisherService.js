const logger = require("../config/logger");
const { pool } = require("../db");
const telegramService = require("./telegram");

class TelegramPublisherService {
  constructor() {
    this.pollingInterval = null;
    this.lastPublishedId = 0;
    this.isRunning = false;
  }

  startPolling(intervalMs = 60000) {
    if (this.isRunning) {
      logger.info("Telegram publisher is already running");
      return;
    }

    logger.info(
      `Starting Telegram publisher service with ${intervalMs}ms interval`
    );
    this.isRunning = true;

    this.initializeLastPublishedId()
      .then(() => {
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

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isRunning = false;
      logger.info("Telegram publisher service stopped");
    }
  }

  async initializeLastPublishedId() {
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'telegram_publishing_tracking'
        );
      `);

      const tableExists = tableCheck.rows[0].exists;

      if (!tableExists) {
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

  formatMessage(content, entity) {
    if (!content.summary) {
      return null;
    }

    let message = "";

    if (entity.username) {
      message += `<b><a href="https://t.me/${entity.username}">${entity.name}</a></b>\n\n`;
    } else {
      message += `<b>${entity.name}</b>\n\n`;
    }

    message += `${content.summary}\n\n`;

    if (content.external_id) {
      let sourceUrl = "";

      if (
        content.content_type === "twitter" ||
        content.content_type === "tweet"
      ) {
        sourceUrl = `https://twitter.com/i/status/${content.external_id}`;
      } else if (content.content_type === "telegram") {
        sourceUrl = content.external_id.startsWith("https://")
          ? content.external_id
          : `https://t.me/c/${content.external_id}`;
      } else if (content.external_id.startsWith("http")) {
        sourceUrl = content.external_id;
      }

      if (sourceUrl) {
        message += `<a href="${sourceUrl}">View source</a>`;
      }
    }

    return message;
  }

  getSentimentLabel(score) {
    if (score >= 0.7) return "Very Positive";
    if (score >= 0.3) return "Positive";
    if (score >= -0.3) return "Neutral";
    if (score >= -0.7) return "Negative";
    return "Very Negative";
  }

  async checkAndPublishNewContent() {
    try {
      logger.debug("Checking for new processed content...");

      await pool.query(`
        UPDATE telegram_publishing_tracking 
        SET last_check_time = NOW() 
        WHERE id = (SELECT id FROM telegram_publishing_tracking ORDER BY id DESC LIMIT 1);
      `);

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

          const message = this.formatMessage(content, entity);

          if (message === null) {
            logger.debug(
              `Skipping content ID ${row.id} due to missing summary`
            );
            lastPublishedId = row.id;
            continue;
          }

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

      if (successCount > 0 || lastPublishedId > this.lastPublishedId) {
        await this.updateLastPublishedId(lastPublishedId);
        logger.info(`Published ${successCount} content items to Telegram`);
      }
    } catch (error) {
      logger.error("Error checking and publishing content:", error);
      throw error;
    }
  }
}

const telegramPublisherService = new TelegramPublisherService();
module.exports = telegramPublisherService;
