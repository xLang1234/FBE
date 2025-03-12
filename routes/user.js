const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const authorize = require("../middleware/authorize");
const { getUserProfile } = require("../services/userService");

// Protected route for user profile
router.get("/profile", authorize, async (req, res) => {
  try {
    const result = await getUserProfile(req.user.id);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error("Profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

module.exports = router;
