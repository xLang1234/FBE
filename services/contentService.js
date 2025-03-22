const logger = require("../config/logger");
const { pool } = require("../db");

const SourceRepository = require("../repositories/sourceRepository");
const EntityRepository = require("../repositories/entityRepository");
const RawContentRepository = require("../repositories/rawContentRepository");
const ProcessedContentRepository = require("../repositories/processedContentRepository");

const { createContentModelsTable } = require("../db/schemas/contentModels");

class ContentService {
  constructor() {
    this.sourceRepository = new SourceRepository(pool);
    this.entityRepository = new EntityRepository(pool);
    this.rawContentRepository = new RawContentRepository(pool);
    this.processedContentRepository = new ProcessedContentRepository(pool);
  }

  async initializeDatabase() {
    try {
      await createContentModelsTable(pool);
      logger.info("Content models tables initialized");
      return true;
    } catch (error) {
      logger.error("Failed to initialize content models tables:", error);
      return false;
    }
  }

  async createSource(sourceData) {
    try {
      const source = await this.sourceRepository.create(sourceData);
      logger.info(`Created new source: ${source.name} (${source.type})`);
      return {
        status: "success",
        data: source,
      };
    } catch (error) {
      logger.error("Error creating source:", error);
      throw error;
    }
  }

  async getSources(filters = {}) {
    try {
      const sources = await this.sourceRepository.getAll(filters);
      return {
        status: "success",
        count: sources.length,
        data: sources,
      };
    } catch (error) {
      logger.error("Error getting sources:", error);
      throw error;
    }
  }

  async getSourcesByType(type) {
    try {
      const sources = await this.sourceRepository.getAll({
        type,
        isActive: true,
      });
      return {
        status: "success",
        count: sources.length,
        data: sources,
      };
    } catch (error) {
      logger.error(`Error getting sources of type ${type}:`, error);
      throw error;
    }
  }

  async updateSource(id, updates) {
    try {
      const source = await this.sourceRepository.update(id, updates);

      if (!source) {
        return {
          status: "error",
          message: `Source with ID ${id} not found or no valid updates provided`,
        };
      }

      logger.info(`Updated source ID ${id}`);
      return {
        status: "success",
        data: source,
      };
    } catch (error) {
      logger.error(`Error updating source ID ${id}:`, error);
      throw error;
    }
  }

  async createEntity(entityData) {
    try {
      const source = await this.sourceRepository.getById(entityData.sourceId);
      if (!source) {
        return {
          status: "error",
          message: `Source with ID ${entityData.sourceId} not found`,
        };
      }

      const existingEntity = await this.entityRepository.getByExternalId(
        entityData.sourceId,
        entityData.entityExternalId
      );

      if (existingEntity) {
        logger.info(
          `Entity already exists with external ID ${entityData.entityExternalId}, updating instead`
        );
        const updatedEntity = await this.entityRepository.update(
          existingEntity.id,
          {
            name: entityData.name,
            username: entityData.username,
            description: entityData.description,
            followersCount: entityData.followersCount,
            relevanceScore: entityData.relevanceScore,
            isActive: entityData.isActive,
          }
        );

        return {
          status: "success",
          data: updatedEntity,
          message: "Entity updated",
        };
      }

      const entity = await this.entityRepository.create(entityData);
      logger.info(
        `Created new entity: ${entity.name} from source ${source.name}`
      );

      return {
        status: "success",
        data: entity,
      };
    } catch (error) {
      logger.error("Error creating entity:", error);
      throw error;
    }
  }

  async getEntities(filters = {}) {
    try {
      const entities = await this.entityRepository.getAll(filters);
      return {
        status: "success",
        count: entities.length,
        data: entities,
      };
    } catch (error) {
      logger.error("Error getting entities:", error);
      throw error;
    }
  }

  async getEntitiesBySourceType(sourceType) {
    try {
      const entities =
        await this.entityRepository.getActiveEntitiesBySourceType(sourceType);
      return {
        status: "success",
        count: entities.length,
        data: entities,
      };
    } catch (error) {
      logger.error(
        `Error getting entities for source type ${sourceType}:`,
        error
      );
      throw error;
    }
  }

  async storeRawContent(contentData) {
    try {
      const entity = await this.entityRepository.getById(contentData.entityId);
      if (!entity) {
        return {
          status: "error",
          message: `Entity with ID ${contentData.entityId} not found`,
        };
      }

      const existingContent = await this.rawContentRepository.getByExternalId(
        contentData.entityId,
        contentData.externalId
      );

      if (existingContent) {
        logger.info(
          `Content already exists with external ID ${contentData.externalId}, skipping`
        );
        return {
          status: "success",
          data: existingContent,
          message: "Content already exists",
        };
      }

      const rawContent = await this.rawContentRepository.create(contentData);
      logger.info(
        `Stored new content from entity ${entity.name} with external ID ${contentData.externalId}`
      );

      return {
        status: "success",
        data: rawContent,
      };
    } catch (error) {
      logger.error("Error storing raw content:", error);
      throw error;
    }
  }

  async storeProcessedContent(processedData) {
    try {
      const rawContent = await this.rawContentRepository.getById(
        processedData.rawContentId
      );
      if (!rawContent) {
        return {
          status: "error",
          message: `Raw content with ID ${processedData.rawContentId} not found`,
        };
      }

      const existingProcessed =
        await this.processedContentRepository.getByRawContentId(
          processedData.rawContentId
        );

      if (existingProcessed) {
        logger.info(
          `Content ID ${processedData.rawContentId} already processed, skipping`
        );
        return {
          status: "success",
          data: existingProcessed,
          message: "Content already processed",
        };
      }

      const processedContent =
        await this.processedContentRepository.create(processedData);
      logger.info(
        `Processed content for raw content ID ${processedData.rawContentId}`
      );

      return {
        status: "success",
        data: processedContent,
      };
    } catch (error) {
      logger.error("Error storing processed content:", error);
      throw error;
    }
  }

  async getUnprocessedContent(limit = 100) {
    try {
      const unprocessedItems =
        await this.rawContentRepository.getUnprocessed(limit);
      return {
        status: "success",
        count: unprocessedItems.length,
        data: unprocessedItems,
      };
    } catch (error) {
      logger.error("Error getting unprocessed content:", error);
      throw error;
    }
  }

  async processBatch(processorFn, limit = 100) {
    try {
      const { data: unprocessedItems } =
        await this.getUnprocessedContent(limit);
      logger.info(`Processing batch of ${unprocessedItems.length} items`);

      if (unprocessedItems.length === 0) {
        return {
          status: "success",
          count: 0,
          message: "No items to process",
        };
      }

      const results = [];
      for (const item of unprocessedItems) {
        try {
          const processedData = await processorFn(item);

          const result = await this.storeProcessedContent({
            rawContentId: item.id,
            ...processedData,
          });

          results.push(result.data);
        } catch (error) {
          logger.error(`Error processing item ID ${item.id}:`, error);
        }
      }

      return {
        status: "success",
        count: results.length,
        data: results,
      };
    } catch (error) {
      logger.error("Error in batch processing:", error);
      throw error;
    }
  }

  async getContentWithMetrics(filters = {}) {
    try {
      const content =
        await this.processedContentRepository.getContentWithMetrics(filters);
      return {
        status: "success",
        count: content.length,
        data: content,
      };
    } catch (error) {
      logger.error("Error getting content with metrics:", error);
      throw error;
    }
  }

  async getMetricsByCategory(filters = {}) {
    try {
      const content =
        await this.processedContentRepository.getContentWithMetrics(filters);

      const categories = {};

      content.forEach((item) => {
        if (!item.categories) return;

        item.categories.forEach((category) => {
          if (!categories[category]) {
            categories[category] = {
              count: 0,
              averageSentiment: 0,
              averageImpact: 0,
              items: [],
            };
          }

          categories[category].count += 1;
          categories[category].averageSentiment += item.sentiment_score || 0;
          categories[category].averageImpact += item.impact_score || 0;
          categories[category].items.push({
            id: item.raw_id,
            externalId: item.external_id,
            entityId: item.entity_id,
            contentType: item.content_type,
            publishedAt: item.published_at,
            sentimentScore: item.sentiment_score,
            impactScore: item.impact_score,
          });
        });
      });

      Object.keys(categories).forEach((category) => {
        const cat = categories[category];
        cat.averageSentiment =
          cat.count > 0 ? cat.averageSentiment / cat.count : 0;
        cat.averageImpact = cat.count > 0 ? cat.averageImpact / cat.count : 0;
      });

      return {
        status: "success",
        data: categories,
      };
    } catch (error) {
      logger.error("Error getting metrics by category:", error);
      throw error;
    }
  }

  async deleteContent(rawContentId) {
    try {
      const deleted = await this.rawContentRepository.delete(rawContentId);

      if (!deleted) {
        return {
          status: "error",
          message: `Content with ID ${rawContentId} not found`,
        };
      }

      return {
        status: "success",
        message: `Content with ID ${rawContentId} deleted successfully`,
      };
    } catch (error) {
      logger.error(`Error deleting content with ID ${rawContentId}:`, error);
      throw error;
    }
  }

  async deleteEntity(entityId) {
    try {
      const deleted = await this.entityRepository.delete(entityId);

      if (!deleted) {
        return {
          status: "error",
          message: `Entity with ID ${entityId} not found`,
        };
      }

      return {
        status: "success",
        message: `Entity with ID ${entityId} and all related content deleted successfully`,
      };
    } catch (error) {
      logger.error(`Error deleting entity with ID ${entityId}:`, error);
      throw error;
    }
  }
}

module.exports = new ContentService();
