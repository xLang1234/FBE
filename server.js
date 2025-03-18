// server.js
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// Import configurations
const logger = require("./config/logger");
const db = require("./db");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const cryptoRoutes = require("./routes/crypto");
const telegramRoutes = require("./routes/telegram");
const dbAdminRoutes = require("./routes/dbAdmin"); // New import

// Import services
const cryptoSentiment = require("./services/cryptoSentiment");
const telegramService = require("./services/telegram");

// Import middleware
const errorHandler = require("./middleware/errorHandler");

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// Use morgan for HTTP request logging
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/crypto", cryptoRoutes);
app.use("/api/telegram", telegramRoutes);

// Register admin routes with a clear path name to indicate these are admin operations
// Only load these routes in development and staging environments
if (process.env.NODE_ENV !== "production") {
  app.use("/api/admin/database", dbAdminRoutes);
  logger.warn("Database admin routes are enabled - disable in production!");
}

// Database initialization endpoint
app.get("/api/init-db", async (req, res) => {
  logger.info("Database initialization requested");

  try {
    await db.initializeDatabase();

    // Initialize crypto sentiment tables
    await cryptoSentiment.initializeDatabase();

    logger.info("Database initialized successfully");
    res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    logger.error("Database initialization error:", error);
    res.status(500).json({ error: "Database initialization failed" });
  }
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Initialize DB connection
  db.initializeDbConnection();

  // Start the crypto sentiment update scheduler
  cryptoSentiment.startUpdateScheduler();
  logger.info("Crypto sentiment scheduler started");

  // Initialize Telegram bot
  if (process.env.TELEGRAM_BOT_TOKEN) {
    const initialized = await telegramService.initialize();
    if (initialized) {
      logger.info("Telegram bot initialized successfully");
    } else {
      logger.warn("Failed to initialize Telegram bot");
    }
  } else {
    logger.warn("TELEGRAM_BOT_TOKEN not set, Telegram functionality disabled");
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
  // In production, you might want to implement graceful shutdown here
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection:", reason);
});

module.exports = app; // Export for testing purposes
