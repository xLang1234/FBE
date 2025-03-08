// server.js - Main server file
const express = require("express");
const cors = require("cors");
const { OAuth2Client } = require("google-auth-library");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const winston = require("winston");
const morgan = require("morgan");
const crypto = require("crypto");
require("dotenv").config();

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "auth-service" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...metadata }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(metadata).length
              ? JSON.stringify(metadata, null, 2)
              : ""
          }`;
        })
      ),
    }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

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

// Initialize Google OAuth client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Initialize PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Log database connection
pool.on("connect", () => {
  logger.info("Connected to PostgreSQL database: " + process.env.DB_NAME);
});

pool.on("error", (err) => {
  logger.error("PostgreSQL error:", err);
});

// Helper function to generate session token
const generateSessionToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

// Helper function to create a session
const createSession = async (userId) => {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  await pool.query(
    "INSERT INTO sessions (user_id, token, expires_at, created_at) VALUES ($1, $2, $3, NOW())",
    [userId, sessionToken, expiresAt]
  );

  return sessionToken;
};

// Verify Google token
async function verifyGoogleToken(token) {
  try {
    logger.debug("Verifying Google token");
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    logger.info("Google token verified successfully", {
      userId: payload.sub,
      email: payload.email,
    });
    return payload;
  } catch (error) {
    logger.error("Error verifying Google token:", error);
    return null;
  }
}

// Save or update Google user in database
async function saveGoogleUser(userData) {
  const { sub, email, name, picture } = userData;

  try {
    logger.debug("Checking if Google user exists in database", {
      googleId: sub,
    });

    // Check if user exists by Google ID
    const checkResult = await pool.query(
      "SELECT * FROM users WHERE google_id = $1",
      [sub]
    );

    if (checkResult.rows.length > 0) {
      // Update existing user
      logger.info("Updating existing Google user in database", {
        googleId: sub,
        email,
      });

      const updateResult = await pool.query(
        "UPDATE users SET email = $1, name = $2, picture = $3, last_login = NOW() WHERE google_id = $4 RETURNING *",
        [email, name, picture, sub]
      );

      logger.debug("Google user updated successfully", {
        userId: updateResult.rows[0].id,
        googleId: sub,
      });

      return updateResult.rows[0];
    } else {
      // Check if user exists by email (might have registered with email/password)
      const emailCheckResult = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
      );

      if (emailCheckResult.rows.length > 0) {
        // Update existing user to link Google account
        logger.info("Linking Google account to existing user", {
          email,
          googleId: sub,
        });

        const linkResult = await pool.query(
          "UPDATE users SET google_id = $1, picture = $2, last_login = NOW() WHERE email = $3 RETURNING *",
          [sub, picture, email]
        );

        return linkResult.rows[0];
      } else {
        // Create new user
        logger.info("Creating new Google user in database", {
          googleId: sub,
          email,
        });

        const insertResult = await pool.query(
          "INSERT INTO users (google_id, email, name, picture, created_at, last_login) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *",
          [sub, email, name, picture]
        );

        logger.debug("Google user created successfully", {
          userId: insertResult.rows[0].id,
          googleId: sub,
        });

        return insertResult.rows[0];
      }
    }
  } catch (error) {
    logger.error("Database error when saving Google user:", error, {
      googleId: sub,
    });
    throw error;
  }
}

// Google sign-in endpoint
app.post("/api/auth/google", async (req, res) => {
  const { token } = req.body;

  logger.debug("Received Google authentication request");

  try {
    // Verify the token
    const payload = await verifyGoogleToken(token);

    if (!payload) {
      logger.warn("Invalid Google token received");
      return res.status(400).json({ error: "Invalid token" });
    }

    // Save or update user in database
    const user = await saveGoogleUser(payload);

    // Create session
    const sessionToken = await createSession(user.id);

    logger.info("User authenticated successfully via Google", {
      userId: user.id,
      email: user.email,
    });

    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      sessionToken,
    });
  } catch (error) {
    logger.error("Google authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Traditional signup endpoint
app.post("/api/auth/signup", async (req, res) => {
  const { username, email, password } = req.body;

  logger.debug("Received traditional signup request", { email });

  try {
    // Validate input
    if (!username || !email || !password) {
      logger.warn("Incomplete signup data received");
      return res.status(400).json({ error: "All fields are required" });
    }

    // Check if email already exists
    const emailCheck = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if (emailCheck.rows.length > 0) {
      logger.warn("Email already in use", { email });
      return res.status(400).json({ error: "Email already in use" });
    }

    // Check if username already exists
    const usernameCheck = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      logger.warn("Username already taken", { username });
      return res.status(400).json({ error: "Username already taken" });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, name, created_at, last_login) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *",
      [username, email, hashedPassword, username]
    );

    const user = result.rows[0];

    // Create session
    const sessionToken = await createSession(user.id);

    logger.info("User registered successfully", { userId: user.id, email });

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
      sessionToken,
    });
  } catch (error) {
    logger.error("Signup error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Traditional login endpoint
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  logger.debug("Received traditional login request");

  try {
    // Find user by email
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      logger.warn("Login attempt with non-existent email", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // If user doesn't have a password (Google-only account)
    if (!user.password_hash) {
      logger.warn("Login attempt to Google-only account", { email });
      return res.status(401).json({ error: "Please login with Google" });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      logger.warn("Login attempt with incorrect password", { email });
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Update last login
    await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
      user.id,
    ]);

    // Create session
    const sessionToken = await createSession(user.id);

    logger.info("User logged in successfully", { userId: user.id, email });

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        picture: user.picture,
      },
      sessionToken,
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout endpoint
app.post("/api/auth/logout", async (req, res) => {
  const { sessionToken } = req.body;

  logger.debug("Received logout request");

  try {
    // Delete session
    if (sessionToken) {
      await pool.query("DELETE FROM sessions WHERE token = $1", [sessionToken]);
    }

    logger.info("User logged out successfully");
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// Protected route example with authorization middleware
const authorize = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Missing or invalid authorization header");
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Check if session exists and is valid
    const result = await pool.query(
      "SELECT s.*, u.id as user_id, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = $1 AND s.expires_at > NOW()",
      [token]
    );

    if (result.rows.length === 0) {
      logger.warn("Invalid or expired session token");
      return res.status(401).json({ error: "Session expired or invalid" });
    }

    // Add user info to request
    req.user = {
      id: result.rows[0].user_id,
      email: result.rows[0].email,
    };

    next();
  } catch (error) {
    logger.error("Authorization error:", error);
    res.status(500).json({ error: "Authorization failed" });
  }
};

// Protected route example
app.get("/api/user/profile", authorize, async (req, res) => {
  try {
    // Get user profile data
    const result = await pool.query(
      "SELECT id, username, name, email, picture, created_at FROM users WHERE id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    logger.info("User profile accessed", { userId: req.user.id });
    res.status(200).json({ user: result.rows[0] });
  } catch (error) {
    logger.error("Profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Database initialization endpoint
app.get("/api/init-db", async (req, res) => {
  logger.info("Database initialization requested");

  try {
    // Create users table with username and password_hash fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id TEXT UNIQUE,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        picture TEXT,
        created_at TIMESTAMP NOT NULL,
        last_login TIMESTAMP NOT NULL
      )
    `);

    // Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    logger.info("Database initialized successfully");
    res.status(200).json({ message: "Database initialized successfully" });
  } catch (error) {
    logger.error("Database initialization error:", error);
    res.status(500).json({ error: "Database initialization failed" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);
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
