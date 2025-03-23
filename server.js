const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const logger = require("./config/logger");
const LOG = require("./constants/logMessages");
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
  logger.warn(LOG.SERVER.DB_ADMIN_WARNING);
}

const contentRoutes = require("./routes/content");
const contentService = require("./services/contentService");
app.use("/api/content", contentRoutes);

app.get("/api/init-db", async (req, res) => {
  logger.info(LOG.SERVER.DB_INIT_REQUEST);

  try {
    await db.initializeDatabase();
    logger.info(LOG.SERVER.DB_INIT_SUCCESS);
    res.status(200).json({ message: LOG.SERVER.DB_INIT_SUCCESS });
  } catch (error) {
    logger.error(LOG.ERROR.DATABASE, error);
    res.status(500).json({ error: LOG.SERVER.DB_INIT_FAILURE });
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
  logger.info(LOG.SERVICE.PUBLISHER_STARTED(publisherInterval));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  logger.info(LOG.SERVER.RUNNING(PORT));
  logger.info(LOG.SERVER.ENVIRONMENT(process.env.NODE_ENV));

  db.initializeDbConnection();

  fearAndGreedIndex.startUpdateScheduler();
  logger.info(LOG.SERVICE.SCHEDULER_STARTED("Fear and greed index"));

  altcoinSeason.startUpdateScheduler();
  logger.info(LOG.SERVICE.SCHEDULER_STARTED("Altcoin season index"));

  cryptoListings.startUpdateScheduler();
  logger.info(LOG.SERVICE.SCHEDULER_STARTED("Crypto listings"));

  if (process.env.TELEGRAM_BOT_TOKEN) {
    const initialized = await telegramService.initialize();
    if (initialized) {
      logger.info(LOG.SERVICE.TELEGRAM_INIT_SUCCESS);
    } else {
      logger.warn(LOG.SERVICE.TELEGRAM_INIT_FAILURE);
    }
  } else {
    logger.warn(LOG.SERVICE.TELEGRAM_DISABLED);
  }
});

process.on("uncaughtException", (error) => {
  logger.error(LOG.ERROR.UNCAUGHT, error);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error(LOG.ERROR.UNHANDLED_REJECTION, reason);
});

module.exports = app;
