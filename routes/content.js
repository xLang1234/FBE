const express = require("express");
const router = express.Router();
const contentService = require("../services/contentService");
const logger = require("../config/logger");
const { authorize, requireRole } = require("../middleware/authorize");
const { CONTENT, ERROR } = require("../constants/logMessages");

router.get("/sources", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const { type, isActive } = req.query;

    logger.info(CONTENT.FETCH_SOURCES);
    const result = await contentService.getSources({
      type,
      isActive: isActive !== undefined ? isActive === "true" : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error(ERROR.CONTENT_SOURCES, error);
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

    logger.info(CONTENT.CREATE_SOURCE(name, type));
    const result = await contentService.createSource({
      name,
      type,
      apiEndpoint,
      credentialsId,
      isActive,
    });

    res.status(201).json(result);
  } catch (error) {
    logger.error(ERROR.CREATE_CONTENT_SOURCE, error);
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

      logger.info(CONTENT.SOURCE_UPDATED(sourceId));
      const result = await contentService.updateSource(sourceId, updates);

      if (result.status === "error") {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error(ERROR.UPDATE_CONTENT_SOURCE(req.params.id), error);
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

    logger.info(CONTENT.FETCH_ENTITIES);
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
    logger.error(ERROR.CONTENT_ENTITIES, error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/entities/by-source-type/:type", authorize, async (req, res) => {
  try {
    const sourceType = req.params.type;

    logger.info(CONTENT.FETCH_ENTITIES_BY_SOURCE(sourceType));
    const result = await contentService.getEntitiesBySourceType(sourceType);

    res.json(result);
  } catch (error) {
    logger.error(ERROR.ENTITIES_BY_SOURCE_TYPE(req.params.type), error);
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

      logger.info(CONTENT.ENTITY_CREATED(name, sourceId));
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
      logger.error(ERROR.CREATE_ENTITY, error);
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

    logger.info(CONTENT.STORE_RAW_CONTENT(entityId));
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
    logger.error(ERROR.STORE_RAW_CONTENT, error);
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

      logger.info(CONTENT.STORE_PROCESSED_CONTENT(rawContentId));
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
      logger.error(ERROR.STORE_PROCESSED_CONTENT, error);
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

      logger.info(CONTENT.FETCH_UNPROCESSED_CONTENT);
      const result = await contentService.getUnprocessedContent(
        limit ? parseInt(limit) : undefined
      );

      res.json(result);
    } catch (error) {
      logger.error(ERROR.UNPROCESSED_CONTENT, error);
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
