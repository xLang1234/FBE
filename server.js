const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

// Import configurations
const logger = require("./config/logger");
const { initializeDbConnection } = require("./config/db");

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const cryptoRoutes = require("./routes/crypto");
// Add these near the top of your app.js file with other imports
const cryptoSentiment = require("./services/cryptoSentiment");

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

// Database initialization endpoint
app.get("/api/init-db", async (req, res) => {
  logger.info("Database initialization requested");

  try {
    await require("./config/db").initializeDatabase();
    // Add this line to initialize crypto sentiment tables
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
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Initialize DB connection
  initializeDbConnection();

  // Start the crypto sentiment update scheduler
  cryptoSentiment.startUpdateScheduler();
  logger.info("Crypto sentiment scheduler started");
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
