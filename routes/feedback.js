// routes/feedback.js
const express = require("express");
const router = express.Router();
const feedback = require("../services/feedback");
const logger = require("../config/logger");
const { authorize } = require("../middleware/authorize");
const { requireRole } = require("../middleware/authorize");

router.post("/", authorize, async (req, res) => {
  try {
    const { feedbackType, content, rating, source } = req.body;

    // Get user ID if authenticated
    const userId = req.user ? req.user.id : null;

    logger.info(`Submitting new ${feedbackType} feedback`);
    const result = await feedback.createFeedback({
      userId,
      feedbackType,
      content,
      rating,
      source,
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error("Error in feedback submission endpoint:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
});

router.get("/", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const { status, feedbackType, userId, limit, offset } = req.query;

    logger.info("Admin fetching feedback list");
    const result = await feedback.getAllFeedback({
      status,
      feedbackType,
      userId: userId ? parseInt(userId) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error("Error in get all feedback endpoint:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/my", authorize, async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info(`User ${userId} fetching their feedback submissions`);
    const result = await feedback.getAllFeedback({ userId });

    res.json(result);
  } catch (error) {
    logger.error("Error in get user feedback endpoint:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/:id", authorize, async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);

    const feedbackResult = await feedback.getFeedback(feedbackId);

    if (feedbackResult.status === "error") {
      return res.status(404).json(feedbackResult);
    }

    // Check if user has permission (admin or feedback owner)
    if (
      req.user.role !== "admin" &&
      feedbackResult.data.user_id !== req.user.id
    ) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to view this feedback",
      });
    }

    res.json(feedbackResult);
  } catch (error) {
    logger.error(
      `Error in get feedback endpoint for ID ${req.params.id}:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.put("/:id", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);
    const updates = req.body;

    logger.info(`Admin updating feedback ID ${feedbackId}`);
    const result = await feedback.updateFeedback(feedbackId, updates);

    if (result.status === "error") {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error(
      `Error in update feedback endpoint for ID ${req.params.id}:`,
      error
    );
    res.status(400).json({ status: "error", message: error.message });
  }
});

router.delete("/:id", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const feedbackId = parseInt(req.params.id);

    logger.info(`Admin deleting feedback ID ${feedbackId}`);
    const result = await feedback.deleteFeedback(feedbackId);

    if (result.status === "error") {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error(
      `Error in delete feedback endpoint for ID ${req.params.id}:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
