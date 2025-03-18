// services/authService.js

const bcrypt = require("bcrypt");
const logger = require("../config/logger");
const { pool } = require("../config/db");
const { createSession } = require("../utils/sessionUtils");
const { verifyGoogleToken } = require("../config/auth");

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

// Process Google sign-in
async function processGoogleSignIn(token) {
  // Verify the token
  const payload = await verifyGoogleToken(token);

  if (!payload) {
    logger.warn("Invalid Google token received");
    return null;
  }

  // Save or update user in database
  const user = await saveGoogleUser(payload);

  // Create session
  const sessionToken = await createSession(user.id);

  logger.info("User authenticated successfully via Google", {
    userId: user.id,
    email: user.email,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
    },
    sessionToken,
  };
}

// Process traditional signup
async function processSignup(username, email, password) {
  // Validate input
  if (!username || !email || !password) {
    logger.warn("Incomplete signup data received");
    return { error: "All fields are required", status: 400 };
  }

  // Check if email already exists
  const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (emailCheck.rows.length > 0) {
    logger.warn("Email already in use", { email });
    return { error: "Email already in use", status: 400 };
  }

  // Check if username already exists
  const usernameCheck = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  if (usernameCheck.rows.length > 0) {
    logger.warn("Username already taken", { username });
    return { error: "Username already taken", status: 400 };
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

  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
    },
    sessionToken,
  };
}

// Process traditional login
async function processLogin(email, password) {
  // Find user by email
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length === 0) {
    logger.warn("Login attempt with non-existent email", { email });
    return { error: "Invalid credentials", status: 401 };
  }

  const user = result.rows[0];

  // If user doesn't have a password (Google-only account)
  if (!user.password_hash) {
    logger.warn("Login attempt to Google-only account", { email });
    return { error: "Please login with Google", status: 401 };
  }

  // Compare password
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    logger.warn("Login attempt with incorrect password", { email });
    return { error: "Invalid credentials", status: 401 };
  }

  // Update last login
  await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
    user.id,
  ]);

  // Create session
  const sessionToken = await createSession(user.id);

  logger.info("User logged in successfully", { userId: user.id, email });

  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      picture: user.picture,
    },
    sessionToken,
  };
}

module.exports = {
  saveGoogleUser,
  processGoogleSignIn,
  processSignup,
  processLogin,
};
