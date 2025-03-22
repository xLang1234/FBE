const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const logger = require("./config/logger");
const db = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const adminRoutes = require("./routes/admin");
const cryptoRoutes = require("./routes/crypto");
const telegramRoutes = require("./routes/telegram");
const dbAdminRoutes = require("./routes/dbAdmin");
const altcoinSeasonRoutes = require("./routes/altcoinSeason");
const cryptoListingsRoutes = require("./routes/cryptoListings");
const feedbackRoutes = require("./routes/feedback");
const paymentRoutes = require("./routes/payment");

const fearAndGreedIndex = require("./services/cryptoSentiment");
const telegramService = require("./services/telegram");
const altcoinSeason = require("./services/altcoinSeason");
const cryptoListings = require("./services/cryptoListings");
const feedbackService = require("./services/feedback");

const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(cors());
app.use(express.json());

app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/crypto", cryptoRoutes);
app.use("/api/telegram", telegramRoutes);
app.use("/api/crypto", altcoinSeasonRoutes);
app.use("/api/crypto", cryptoListingsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/payment", paymentRoutes);

if (process.env.NODE_ENV !== "production") {
  app.use("/api/admin/database", dbAdminRoutes);
  logger.warn("Database admin routes are enabled - disable in production!");
}

const contentRoutes = require("./routes/content");

const contentService = require("./services/contentService");

app.use("/api/content", contentRoutes);

app.get("/api/init-db", async (req, res) => {
  logger.info("Database initialization requested");

  try {
    await db.initializeDatabase();

    await contentService.initializeDatabase();

    await fearAndGreedIndex.initializeDatabase();

    await altcoinSeason.initializeDatabase();

    await cryptoListings.initializeDatabase();

    await feedbackService.initializeDatabase();

    logger.info("Database initialized successfully");
    res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    logger.error("Database initialization error:", error);
    res.status(500).json({ error: "Database initialization failed" });
  }
});

app.use(errorHandler);

const telegramPublisherRoutes = require("./routes/telegramPublisher");

const telegramPublisherService = require("./services/telegramPublisherService");

app.use("/api/telegram-publisher", telegramPublisherRoutes);

if (
  process.env.TELEGRAM_BOT_TOKEN &&
  process.env.ENABLE_TELEGRAM_PUBLISHER === "true"
) {
  const publisherInterval =
    parseInt(process.env.TELEGRAM_PUBLISHER_INTERVAL || "60") * 1000;
  telegramPublisherService.startPolling(publisherInterval);
  logger.info(
    `Telegram publisher service started with ${publisherInterval}ms interval`
  );
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  db.initializeDbConnection();

  fearAndGreedIndex.startUpdateScheduler();
  logger.info("Fear and greed index scheduler started");

  altcoinSeason.startUpdateScheduler();
  logger.info("Altcoin season index scheduler started");

  cryptoListings.startUpdateScheduler();
  logger.info("Crypto listings scheduler started");

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

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled promise rejection:", reason);
});

module.exports = app;
