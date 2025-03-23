// services/telegram.js

const axios = require("axios");
const logger = require("../config/logger");

class TelegramService {
  constructor() {
    this.apiToken = process.env.TELEGRAM_BOT_TOKEN;
    this.apiUrl = `https://api.telegram.org/bot${this.apiToken}`;
    this.chatIds = new Set();

    if (process.env.TELEGRAM_CHAT_IDS) {
      const ids = process.env.TELEGRAM_CHAT_IDS.split(",");
      ids.forEach((id) => this.chatIds.add(id.trim()));
    }
  }

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

  registerChatId(chatId) {
    this.chatIds.add(chatId);
    logger.info(`Chat ID ${chatId} registered for broadcasts`);
  }

  unregisterChatId(chatId) {
    this.chatIds.delete(chatId);
    logger.info(`Chat ID ${chatId} unregistered from broadcasts`);
  }

  getRegisteredChatIds() {
    return Array.from(this.chatIds);
  }
}

const telegramService = new TelegramService();
module.exports = telegramService;
