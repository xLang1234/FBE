const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const {
  processGoogleSignIn,
  processSignup,
  processLogin,
} = require("../services/authService");
const { invalidateSession } = require("../utils/sessionUtils");
const { AUTH, ERROR } = require("../constants/logMessages");

// Google sign-in endpoint
router.post("/google", async (req, res) => {
  const { token } = req.body;

  logger.debug(AUTH.GOOGLE_AUTH_REQUEST);

  try {
    const result = await processGoogleSignIn(token);

    if (!result) {
      return res.status(400).json({ error: "Invalid token" });
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error(ERROR.GOOGLE_AUTH, error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Traditional signup endpoint
router.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  logger.debug(AUTH.SIGNUP_REQUEST(email));

  try {
    const result = await processSignup(username, email, password);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error(ERROR.SIGNUP, error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Traditional login endpoint
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  logger.debug(AUTH.LOGIN_REQUEST);

  try {
    const result = await processLogin(email, password);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error(ERROR.LOGIN, error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  const { sessionToken } = req.body;

  logger.debug(AUTH.LOGOUT_REQUEST);

  try {
    await invalidateSession(sessionToken);

    logger.info(AUTH.LOGOUT_SUCCESS);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error(ERROR.LOGOUT, error);
    res.status(500).json({ error: "Logout failed" });
  }
});

module.exports = router;
