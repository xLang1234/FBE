// services/telegram.js

const axios = require("axios");
const logger = require("../config/logger");

class TelegramService {
  constructor() {
    this.apiToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.apiToken}`;
    this.chatIds = new Set();

    // Load chat IDs from environment variable if available
    if (process.env.TELEGRAM_CHAT_IDS) {
      const ids = process.env.TELEGRAM_CHAT_IDS.split(",");
      ids.forEach((id) => this.chatIds.add(id.trim()));
    }
  }

  /**
   * Initialize the Telegram bot and verify the token
   */
  async initialize() {
    if (!this.apiToken) {
      logger.error(
        "TELEGRAM_BOT_TOKEN is not defined in environment variables"
      );
      return false;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/getMe`);
      if (response.data && response.data.ok) {
        logger.info(
          `Telegram bot initialized: ${response.data.result.username}`
        );
        return true;
      } else {
        logger.error("Failed to initialize Telegram bot: Invalid response");
        return false;
      }
    } catch (error) {
      logger.error("Failed to initialize Telegram bot:", error.message);
      return false;
    }
  }

  /**
   * Send a message to a specific chat
   * @param {string} chatId - The chat ID to send the message to
   * @param {string} message - The message to send
   * @returns {Promise<boolean>} - Whether the message was sent successfully
   */
  async sendMessage(chatId, message) {
    if (!this.apiToken) {
      logger.error("Cannot send message: TELEGRAM_BOT_TOKEN is not defined");
      return false;
    }

    try {
      const response = await axios.post(`${this.apiUrl}/sendMessage`, {
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      });

      if (response.data && response.data.ok) {
        logger.info(`Message sent to chat ${chatId}`);
        return true;
      } else {
        logger.error(
          `Failed to send message to chat ${chatId}: ${JSON.stringify(
            response.data
          )}`
        );
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send message to chat ${chatId}:`, error.message);
      return false;
    }
  }

  /**
   * Broadcast a message to all registered chat IDs
   * @param {string} message - The message to broadcast
   * @returns {Promise<{success: number, failed: number}>} - Count of successful and failed deliveries
   */
  async broadcastMessage(message) {
    if (this.chatIds.size === 0) {
      logger.warn("No chat IDs registered for broadcasting");
      return { success: 0, failed: 0 };
    }

    let success = 0;
    let failed = 0;

    for (const chatId of this.chatIds) {
      const result = await this.sendMessage(chatId, message);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    logger.info(`Broadcast complete: ${success} successful, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Register a chat ID for broadcasting
   * @param {string} chatId - The chat ID to register
   */
  registerChatId(chatId) {
    this.chatIds.add(chatId);
    logger.info(`Chat ID ${chatId} registered for broadcasts`);
  }

  /**
   * Unregister a chat ID from broadcasting
   * @param {string} chatId - The chat ID to unregister
   */
  unregisterChatId(chatId) {
    this.chatIds.delete(chatId);
    logger.info(`Chat ID ${chatId} unregistered from broadcasts`);
  }

  /**
   * Get all registered chat IDs
   * @returns {string[]} - Array of registered chat IDs
   */
  getRegisteredChatIds() {
    return Array.from(this.chatIds);
  }
}

// Create and export a singleton instance
const telegramService = new TelegramService();
module.exports = telegramService;
