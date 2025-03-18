// routes/telegram.js
const express = require("express");
const router = express.Router();
const telegramService = require("../services/telegram");
const logger = require("../config/logger");

/**
 * Initialize the Telegram bot
 */
router.post("/initialize", async (req, res) => {
  try {
    const success = await telegramService.initialize();
    if (success) {
      res
        .status(200)
        .json({ message: "Telegram bot initialized successfully" });
    } else {
      res.status(500).json({ error: "Failed to initialize Telegram bot" });
    }
  } catch (error) {
    logger.error("Error initializing Telegram bot:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Send a message to a specific chat
 */
router.post("/send", async (req, res) => {
  const { chatId, message } = req.body;

  if (!chatId || !message) {
    return res.status(400).json({ error: "Chat ID and message are required" });
  }

  try {
    const success = await telegramService.sendMessage(chatId, message);
    if (success) {
      res.status(200).json({ message: "Message sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send message" });
    }
  } catch (error) {
    logger.error("Error sending Telegram message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Broadcast a message to all registered chats
 */
router.post("/broadcast", async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const result = await telegramService.broadcastMessage(message);
    res.status(200).json({
      message: "Broadcast completed",
      stats: result,
    });
  } catch (error) {
    logger.error("Error broadcasting Telegram message:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Register a chat ID for broadcasting
 */
router.post("/register", (req, res) => {
  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ error: "Chat ID is required" });
  }

  telegramService.registerChatId(chatId);
  res.status(200).json({ message: "Chat ID registered successfully" });
});

/**
 * Unregister a chat ID from broadcasting
 */
router.delete("/register/:chatId", (req, res) => {
  const { chatId } = req.params;

  if (!chatId) {
    return res.status(400).json({ error: "Chat ID is required" });
  }

  telegramService.unregisterChatId(chatId);
  res.status(200).json({ message: "Chat ID unregistered successfully" });
});

/**
 * Get all registered chat IDs
 */
router.get("/registered", (req, res) => {
  const chatIds = telegramService.getRegisteredChatIds();
  res.status(200).json({ chatIds });
});

module.exports = router;
