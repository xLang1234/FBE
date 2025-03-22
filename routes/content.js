const express = require("express");
const router = express.Router();
const contentService = require("../services/contentService");
const logger = require("../config/logger");
const { authorize, requireRole } = require("../middleware/authorize");

router.get("/sources", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const { type, isActive } = req.query;

    logger.info("Fetching content sources");
    const result = await contentService.getSources({
      type,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error("Error in get content sources endpoint:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/sources", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const { name, type, apiEndpoint, credentialsId, isActive } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        status: "error",
        message: "Source name and type are required",
      });
    }

    logger.info(`Creating new content source: ${name} (${type})`);
    const result = await contentService.createSource({
      name,
      type,
      apiEndpoint,
      credentialsId,
      isActive,
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error("Error in create content source endpoint:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
});

router.put(
  "/sources/:id",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const sourceId = parseInt(req.params.id);
      const updates = req.body;

      logger.info(`Updating content source ID ${sourceId}`);
      const result = await contentService.updateSource(sourceId, updates);

      if (result.status === "error") {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error(
        `Error in update content source endpoint for ID ${req.params.id}:`,
        error
      );
      res.status(400).json({ status: "error", message: error.message });
    }
  }
);

router.get("/entities", authorize, async (req, res) => {
  try {
    const {
      sourceId,
      isActive,
      username,
      minFollowers,
      minRelevance,
      limit,
      offset,
    } = req.query;

    logger.info("Fetching content entities");
    const result = await contentService.getEntities({
      sourceId: sourceId ? parseInt(sourceId) : undefined,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
      username,
      minFollowers: minFollowers ? parseInt(minFollowers) : undefined,
      minRelevance: minRelevance ? parseFloat(minRelevance) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error("Error in get content entities endpoint:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/entities/by-source-type/:type", authorize, async (req, res) => {
  try {
    const sourceType = req.params.type;

    logger.info(`Fetching content entities for source type: ${sourceType}`);
    const result = await contentService.getEntitiesBySourceType(sourceType);

    res.json(result);
  } catch (error) {
    logger.error(
      `Error in get entities by source type endpoint for type ${req.params.type}:`,
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post(
  "/entities",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const {
        sourceId,
        entityExternalId,
        name,
        username,
        description,
        followersCount,
        relevanceScore,
        isActive,
      } = req.body;

      if (!sourceId || !entityExternalId || !name) {
        return res.status(400).json({
          status: "error",
          message: "Source ID, external ID, and name are required",
        });
      }

      logger.info(`Creating new entity: ${name}`);
      const result = await contentService.createEntity({
        sourceId,
        entityExternalId,
        name,
        username,
        description,
        followersCount,
        relevanceScore,
        isActive,
      });

      if (result.status === "error") {
        return res.status(404).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error("Error in create entity endpoint:", error);
      res.status(400).json({ status: "error", message: error.message });
    }
  }
);

router.post("/raw", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const {
      entityId,
      externalId,
      contentType,
      content,
      publishedAt,
      engagementMetrics,
      rawData,
    } = req.body;

    if (!entityId || !externalId || !contentType || !content || !publishedAt) {
      return res.status(400).json({
        status: "error",
        message:
          "Entity ID, external ID, content type, content, and published date are required",
      });
    }

    logger.info(`Storing raw content for entity ID ${entityId}`);
    const result = await contentService.storeRawContent({
      entityId,
      externalId,
      contentType,
      content,
      publishedAt: new Date(publishedAt),
      engagementMetrics,
      rawData,
    });

    if (result.status === "error") {
      return res.status(404).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    logger.error("Error in store raw content endpoint:", error);
    res.status(400).json({ status: "error", message: error.message });
  }
});

router.post(
  "/processed",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const {
        rawContentId,
        sentimentScore,
        impactScore,
        categories,
        keywords,
        entitiesMentioned,
        summary,
      } = req.body;

      if (!rawContentId) {
        return res.status(400).json({
          status: "error",
          message: "Raw content ID is required",
        });
      }

      logger.info(
        `Storing processed content for raw content ID ${rawContentId}`
      );
      const result = await contentService.storeProcessedContent({
        rawContentId,
        sentimentScore,
        impactScore,
        categories,
        keywords,
        entitiesMentioned,
        summary,
      });

      if (result.status === "error") {
        return res.status(404).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error("Error in store processed content endpoint:", error);
      res.status(400).json({ status: "error", message: error.message });
    }
  }
);

router.get(
  "/unprocessed",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { limit } = req.query;

      logger.info("Fetching unprocessed content");
      const result = await contentService.getUnprocessedContent(
        limit ? parseInt(limit) : undefined
      );

      res.json(result);
    } catch (error) {
      logger.error("Error in get unprocessed content endpoint:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.get("/metrics", authorize, async (req, res) => {
  try {
    const {
      entityId,
      contentType,
      startDate,
      endDate,
      minSentiment,
      minImpact,
      category,
      limit,
      offset,
    } = req.query;

    logger.info("Fetching content with metrics");
    const result = await contentService.getContentWithMetrics({
      entityId: entityId ? parseInt(entityId) : undefined,
      contentType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      minSentiment: minSentiment ? parseFloat(minSentiment) : undefined,
      minImpact: minImpact ? parseFloat(minImpact) : undefined,
      category,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error("Error in get content with metrics endpoint:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/metrics/by-category", authorize, async (req, res) => {
  try {
    const { entityId, contentType, startDate, endDate } = req.query;

    logger.info("Fetching metrics by category");
    const result = await contentService.getMetricsByCategory({
      entityId: entityId ? parseInt(entityId) : undefined,
      contentType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error("Error in get metrics by category endpoint:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.delete(
  "/raw/:id",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const contentId = parseInt(req.params.id);

      logger.info(`Deleting content ID ${contentId}`);
      const result = await contentService.deleteContent(contentId);

      if (result.status === "error") {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error(
        `Error in delete content endpoint for ID ${req.params.id}:`,
        error
      );
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

router.delete(
  "/entities/:id",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const entityId = parseInt(req.params.id);

      logger.info(`Deleting entity ID ${entityId}`);
      const result = await contentService.deleteEntity(entityId);

      if (result.status === "error") {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error(
        `Error in delete entity endpoint for ID ${req.params.id}:`,
        error
      );
      res.status(500).json({ status: "error", message: error.message });
    }
  }
);

module.exports = router;
