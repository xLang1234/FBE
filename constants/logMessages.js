/**
 * Centralized message constants for logging and console output
 */

// Server and initialization messages
const SERVER = {
  RUNNING: (port) => `Server running on port ${port}`,
  ENVIRONMENT: (env) => `Environment: ${env || "development"}`,
  DB_INIT_REQUEST: "Database initialization requested",
  DB_INIT_SUCCESS: "Database initialized successfully",
  DB_INIT_FAILURE: "Database initialization failed",
  DB_ADMIN_WARNING:
    "Database admin routes are enabled - disable in production!",
  DB_CONNECTED: (dbName) => `Connected to PostgreSQL database: ${dbName}`,
  DB_CONNECTION_ERROR: "PostgreSQL error:",
  DB_CONNECTION_FAILED: "Failed to connect to database:",
};

// Service initialization messages
const SERVICE = {
  TABLES_INIT_SUCCESS: (service) => `${service} tables initialized`,
  TABLES_INIT_FAILURE: (service) => `Failed to initialize ${service} tables:`,
  SCHEDULER_STARTED: (service) => `${service} scheduler started`,
  SCHEDULER_RUNNING: (service) => `Running scheduled update for ${service}`,
  SCHEDULER_FAILED: (service) => `Scheduled ${service} update failed:`,
  PUBLISHER_STARTED: (interval) =>
    `Telegram publisher service started with ${interval}ms interval`,
  TELEGRAM_INIT_SUCCESS: "Telegram bot initialized successfully",
  TELEGRAM_INIT_FAILURE: "Failed to initialize Telegram bot",
  TELEGRAM_DISABLED:
    "TELEGRAM_BOT_TOKEN not set, Telegram functionality disabled",
  LOGGER_CONFIG: "Configuring logger with level:",
};

// Data fetch and processing messages
const DATA = {
  FETCHING: (source) => `Fetching ${source} data`,
  UPDATE_SKIPPED: (service) => `Skipping ${service} update - not time yet`,
  SAVING_RECORDS: (count, type) => `Saving ${count} ${type} records`,
  UPDATE_COMPLETE: (service, count) =>
    `${service} update complete. Inserted ${count} new records`,
  FETCH_ERROR: (source) => `Error fetching ${source} data:`,
  PROCESSING_BATCH: (count) => `Processing batch of ${count} items`,
  NO_ITEMS: "No items to process",
  PROCESSING_ERROR: (id) => `Error processing item ID ${id}:`,
};

// Authentication messages
const AUTH = {
  GOOGLE_CHECK: "Checking if Google user exists in database",
  GOOGLE_UPDATE: "Updating existing Google user in database",
  GOOGLE_CREATE: "Creating new Google user in database",
  GOOGLE_LINK: "Linking Google account to existing user",
  GOOGLE_SUCCESS: "Google user updated successfully",
  GOOGLE_CREATE_SUCCESS: "Google user created successfully",
  GOOGLE_INVALID: "Invalid Google token received",
  GOOGLE_TOKEN_VERIFY: "Verifying Google token",
  GOOGLE_TOKEN_VERIFIED: "Google token verified successfully",
  GOOGLE_TOKEN_ERROR: "Error verifying Google token:",
  LOGIN_SUCCESS: "User logged in successfully",
  SIGNUP_SUCCESS: "User registered successfully",
  INVALID_EMAIL: "Login attempt with non-existent email",
  INCORRECT_PASSWORD: "Login attempt with incorrect password",
  GOOGLE_ONLY: "Login attempt to Google-only account",
  INCOMPLETE_DATA: "Incomplete signup data received",
  EMAIL_TAKEN: "Email already in use",
  USERNAME_TAKEN: "Username already taken",
  ROLE_UPDATED: "User role updated successfully",
  INVALID_ROLE: "Attempted to assign invalid role",
  LOGIN_REQUEST: "Received traditional login request",
  SIGNUP_REQUEST: (email) => `Received traditional signup request for ${email}`,
  GOOGLE_AUTH_REQUEST: "Received Google authentication request",
  LOGOUT_REQUEST: "Received logout request",
  LOGOUT_SUCCESS: "User logged out successfully",
};

// Content management messages
const CONTENT = {
  SOURCE_CREATED: (name, type) => `Created new source: ${name} (${type})`,
  SOURCE_UPDATED: (id) => `Updated source ID ${id}`,
  ENTITY_CREATED: (name, source) =>
    `Created new entity: ${name} from source ${source}`,
  ENTITY_EXISTS: (id) =>
    `Entity already exists with external ID ${id}, updating instead`,
  CONTENT_STORED: (name, id) =>
    `Stored new content from entity ${name} with external ID ${id}`,
  CONTENT_EXISTS: (id) =>
    `Content already exists with external ID ${id}, skipping`,
  CONTENT_PROCESSED: (id) => `Processed content for raw content ID ${id}`,
  ALREADY_PROCESSED: (id) => `Content ID ${id} already processed, skipping`,
  SOURCE_NOT_FOUND: (id) =>
    `Source with ID ${id} not found or no valid updates provided`,
  ENTITY_NOT_FOUND: (id) => `Entity with ID ${id} not found`,
  CONTENT_NOT_FOUND: (id) => `Raw content with ID ${id} not found`,
  CONTENT_DELETED: (id) => `Content with ID ${id} deleted successfully`,
  ENTITY_DELETED: (id) =>
    `Entity with ID ${id} and all related content deleted successfully`,
  FETCH_SOURCES: "Fetching content sources",
  FETCH_ENTITIES: "Fetching content entities",
  FETCH_ENTITIES_BY_SOURCE: (sourceType) =>
    `Fetching content entities for source type: ${sourceType}`,
  STORE_RAW_CONTENT: (entityId) =>
    `Storing raw content for entity ID ${entityId}`,
  STORE_PROCESSED_CONTENT: (rawContentId) =>
    `Storing processed content for raw content ID ${rawContentId}`,
  FETCH_UNPROCESSED_CONTENT: "Fetching unprocessed content",
  FETCH_CONTENT_METRICS: "Fetching content with metrics",
  FETCH_METRICS_BY_CATEGORY: "Fetching metrics by category",
  CREATE_SOURCE: (name, type) =>
    `Creating new content source: ${name} (${type})`,
  DELETE_ENTITY: (id) => `Deleting entity ID ${id}`,
  DELETE_CONTENT: (id) => `Deleting content ID ${id}`,
};

// Cryptocurrency service messages
const CRYPTO = {
  TABLES_INIT_FAILURE: "Failed to initialize cryptocurrency tables:",
  UPDATE_CHECK_ERROR: "Error checking if update is needed:",
  TIMESTAMP_UPDATE_ERROR: "Error updating last updated timestamp:",
  UPDATE_FAILURE: "Failed to update cryptocurrency data:",
  API_NO_DATA: "No data returned from CoinMarketCap API",
  API_FETCH_ERROR: "Error fetching cryptocurrency listings from API:",
  API_RESPONSE_ERROR: "API response error:",
  API_RATE_LIMIT: "Rate limit hit, retrying with next API key",
  API_FETCH_FAILURE: "Failed to fetch cryptocurrency listings from API",
  DB_SAVE_ERROR: "Error saving cryptocurrencies to database:",
  DB_SAVE_PRICES_ERROR: "Error saving cryptocurrency prices to database:",
  TOP_CRYPTO_ERROR: "Error getting top cryptocurrencies:",
  SYMBOL_NOT_FOUND: (symbol) =>
    `Cryptocurrency with symbol ${symbol} not found`,
  SYMBOL_FETCH_ERROR: (symbol) =>
    `Error getting cryptocurrency by symbol ${symbol}:`,
  HISTORICAL_PRICES_ERROR: (symbol) =>
    `Error getting historical prices for ${symbol}:`,
  ANALYSIS_ERROR: "Error analyzing cryptocurrency data:",
  NEXT_UPDATE_SCHEDULED: (timestamp) =>
    `Next cryptocurrency update scheduled for ${timestamp}`,
  CRYPTOCURRENCIES_SAVED: (count) =>
    `Saved ${count} cryptocurrencies to database`,
  PRICES_SAVED: (count) => `Saved latest prices for ${count} cryptocurrencies`,
  TABLES_INIT_START: "Creating cryptocurrencies table",
  TABLES_INIT_PRICES: "Creating cryptocurrency_prices table",
  TABLES_INIT_TAGS: "Creating cryptocurrency_tags table",
  TABLES_INIT_LAST_UPDATE: "Creating cryptocurrency_listings_last_update table",
  TABLES_INIT_COMPLETE: "All cryptocurrency tables created successfully",
  TABLES_DROP: "Dropping existing cryptocurrency tables",
  TABLE_CREATE_ERROR: (table) => `Error creating ${table} table:`,
  FETCH_TOP_CRYPTO: (limit, offset) =>
    `Fetching top ${limit} cryptocurrencies with offset ${offset}`,
  FETCH_CRYPTO_BY_SYMBOL: (symbol) =>
    `Fetching cryptocurrency data for symbol ${symbol}`,
  FETCH_HISTORICAL_CRYPTO: (days, symbol) =>
    `Fetching ${days} days of historical data for ${symbol}`,
  ANALYZE_MARKET_DATA: (limit) =>
    `Analyzing market data for top ${limit} cryptocurrencies`,
  FORCE_UPDATE_CRYPTO: "Admin requested force update of cryptocurrency data",
  DAILY_SUMMARY_ERROR: "Error sending daily summary",
  DAILY_SUMMARY_SUCCESS: "Daily summary sent successfully",
};

// Database messages
const DATABASE = {
  INIT_START: "Starting database initialization",
  INIT_COMPLETE: "Database initialization completed successfully",
  INIT_FAILURE: "Database initialization failed:",
  AUTH_TABLES_CREATED: "Auth tables created",
  PAYMENTS_TABLES_CREATED: "Payments tables created",
  DROP_TABLES_WARNING: "⚠️ WARNING: Dropping all tables from database!",
  NO_TABLES_TO_DROP: "No tables found to drop",
  DROPPING_TABLES: (count, tables) => `Dropping ${count} tables: ${tables}`,
  DROP_TABLES_SUCCESS: "All tables dropped successfully",
  DROP_TABLES_ERROR: "Error dropping tables:",
};

// Error messages
const ERROR = {
  DATABASE: "Database error:",
  API_RESPONSE: (api) => `Invalid response format from ${api} API`,
  UNCAUGHT: "Uncaught exception:",
  UNHANDLED_REJECTION: "Unhandled promise rejection:",
  CATEGORY_METRICS: "Error getting metrics by category:",
  CONTENT_METRICS: "Error getting content with metrics:",
  BATCH_PROCESSING: "Error in batch processing:",
  SOURCE_GET: "Error getting sources:",
  SOURCE_GET_BY_TYPE: (type) => `Error getting sources of type ${type}:`,
  SOURCE_CREATE: "Error creating source:",
  SOURCE_UPDATE: (id) => `Error updating source ID ${id}:`,
  ENTITY_GET: "Error getting entities:",
  ENTITY_GET_BY_TYPE: (type) =>
    `Error getting entities for source type ${type}:`,
  ENTITY_CREATE: "Error creating entity:",
  ENTITY_DELETE: (id) => `Error deleting entity with ID ${id}:`,
  CONTENT_STORE_RAW: "Error storing raw content:",
  CONTENT_STORE_PROCESSED: "Error storing processed content:",
  CONTENT_GET_UNPROCESSED: "Error getting unprocessed content:",
  CONTENT_DELETE: (id) => `Error deleting content with ID ${id}:`,
  ROLE_CHANGE: "Error changing user role:",
  FETCH_USERS: "Error fetching users:",
  GOOGLE_AUTH: "Google authentication error:",
  SIGNUP: "Signup error:",
  LOGIN: "Login error:",
  LOGOUT: "Logout error:",
  ALTCOIN_SEASON_HISTORICAL: "Error in historical altcoin season endpoint:",
  ALTCOIN_SEASON_LATEST: "Error in latest altcoin season endpoint:",
  ALTCOIN_SEASON_ANALYSIS: "Error in altcoin season analysis endpoint:",
  ALTCOIN_SEASON_UPDATE: "Error in force update endpoint:",
  FEAR_GREED_HISTORICAL: "Error in historical fear and greed index endpoint:",
  FEAR_GREED_LATEST: "Error in latest fear and greed index endpoint:",
  FEAR_GREED_ANALYSIS: "Error in fear and greed index analysis endpoint:",
  FEAR_GREED_UPDATE: "Error in force update endpoint:",
  CONTENT_SOURCES: "Error in get content sources endpoint:",
  CREATE_CONTENT_SOURCE: "Error in create content source endpoint:",
  UPDATE_CONTENT_SOURCE: (id) =>
    `Error in update content source endpoint for ID ${id}:`,
  CONTENT_ENTITIES: "Error in get content entities endpoint:",
  ENTITIES_BY_SOURCE_TYPE: (type) =>
    `Error in get entities by source type endpoint for type ${type}:`,
  CREATE_ENTITY: "Error in create entity endpoint:",
  STORE_RAW_CONTENT: "Error in store raw content endpoint:",
  STORE_PROCESSED_CONTENT: "Error in store processed content endpoint:",
  UNPROCESSED_CONTENT: "Error in get unprocessed content endpoint:",
  CONTENT_WITH_METRICS: "Error in get content with metrics endpoint:",
  METRICS_BY_CATEGORY: "Error in get metrics by category endpoint:",
  DELETE_CONTENT: (id) => `Error in delete content endpoint for ID ${id}:`,
  DELETE_ENTITY: (id) => `Error in delete entity endpoint for ID ${id}:`,
};

// Sentiment analysis messages
const SENTIMENT = {
  BATCH_SAVE_ERROR: "Error saving batch fear and greed index data:",
  UPDATE_CHECK_ERROR: "Error checking update time:",
  LAST_UPDATE_ERROR: "Error updating last_update record:",
  HISTORICAL_DATA_ERROR: "Error fetching historical data:",
  LATEST_DATA_ERROR: "Error fetching latest fear and greed index data:",
  INDEX_SAVED: (count) => `Saved ${count} fear and greed index records`,
  NEXT_UPDATE_SCHEDULED: (timestamp) =>
    `Next sentiment update scheduled for ${timestamp}`,
  UPDATE_SKIPPED: "Skipping sentiment update - not time yet",
  TABLES_INIT_START: "Creating fear_and_greed_index table",
  TABLES_INIT_LAST_UPDATE: "Creating last_update table for sentiment tracking",
  TABLES_INIT_COMPLETE: "All sentiment tables created successfully",
  TABLE_CREATE_ERROR: (table) => `Error creating ${table} table:`,
  API_FETCH_ERROR: "Error fetching sentiment data from API:",
  API_NO_DATA: "No data returned from sentiment API",
  FETCH_HISTORICAL: (days) =>
    `Fetching ${days} days of historical fear and greed index data from database`,
  FETCH_LATEST: "Fetching latest fear and greed index data from database",
  ANALYZE_DATA: (days) =>
    `Analyzing fear and greed index data for the last ${days} days from database`,
  FORCE_UPDATE: "Admin requested force update of fear and greed index data",
};

// Feedback messages
const FEEDBACK = {
  CREATE_SUCCESS: "Feedback created successfully",
  CREATE_ERROR: "Error creating feedback:",
  GET_ERROR: (id) => `Error getting feedback with id ${id}:`,
  GET_ALL_ERROR: "Error getting all feedback:",
  UPDATE_SUCCESS: (id) => `Feedback ID ${id} updated successfully`,
  UPDATE_ERROR: (id) => `Error updating feedback with id ${id}:`,
  DELETE_SUCCESS: (id) => `Feedback ID ${id} deleted successfully`,
  DELETE_ERROR: (id) => `Error deleting feedback with id ${id}:`,
  STATUS_CHANGE: (id, status) =>
    `Feedback ID ${id} status changed to ${status}`,
  TABLES_INIT_START: "Creating feedback table",
  TABLES_INIT_COMPLETE: "Feedback table created successfully",
  TABLE_CREATE_ERROR: "Error creating feedback table:",
  FEEDBACK_RECEIVED: (type) => `New ${type} feedback received`,
  METRICS_ERROR: "Error calculating feedback metrics:",
};

// Entity messages
const ENTITY = {
  CREATE_SUCCESS: (name) => `Entity ${name} created successfully`,
  CREATE_ERROR: "Error creating entity:",
  GET_ERROR: (id) => `Error getting entity with id ${id}:`,
  GET_BY_EXTERNAL_ERROR: (externalId) =>
    `Error getting entity with external id ${externalId}:`,
  GET_ALL_ERROR: "Error getting all entities:",
  UPDATE_SUCCESS: (id) => `Entity ID ${id} updated successfully`,
  UPDATE_ERROR: (id) => `Error updating entity with id ${id}:`,
  DELETE_SUCCESS: (id) => `Entity ID ${id} deleted successfully`,
  DELETE_ERROR: (id) => `Error deleting entity with id ${id}:`,
  ACTIVE_BY_SOURCE_ERROR: (sourceType) =>
    `Error getting active entities for source type ${sourceType}:`,
  STATUS_CHANGE: (id, status) => `Entity ID ${id} status changed to ${status}`,
};

// Admin messages
const ADMIN = {
  FETCH_USERS: "Fetching users",
  ROLE_CHANGE_REQUEST: (userId, role) =>
    `User ${userId} role change requested to ${role}`,
  ROLE_CHANGE_SUCCESS: "Role updated successfully",
};

// Altcoin season messages
const ALTCOIN = {
  FETCH_HISTORICAL: (days) =>
    `Fetching ${days} days of historical altcoin season data from database`,
  FETCH_LATEST: "Fetching latest altcoin season data from database",
  ANALYZE_DATA: (days) =>
    `Analyzing altcoin season data for the last ${days} days from database`,
  FORCE_UPDATE: "Admin requested force update of altcoin season data",
  UPDATE_SUCCESS: "Altcoin season data update triggered successfully",
  TABLES_INIT_START: "Creating altcoin_season_index table",
  TABLES_INIT_LAST_UPDATE:
    "Creating last_update table for altcoin season tracking",
  TABLES_INIT_COMPLETE: "All altcoin season tables created successfully",
  INDEX_SAVED: (count) => `Saved ${count} altcoin season index records`,
  UPDATE_CHECK_ERROR: "Error checking if altcoin season update is needed:",
  LAST_UPDATE_ERROR: "Error updating altcoin season last_update record:",
  HISTORICAL_DATA_ERROR: "Error fetching historical altcoin season data:",
  LATEST_DATA_ERROR: "Error fetching latest altcoin season data:",
  ANALYSIS_ERROR: "Error analyzing altcoin season data:",
  NEXT_UPDATE_SCHEDULED: (timestamp) =>
    `Next altcoin season update scheduled for ${timestamp}`,
};

// Routes messages
const ROUTES = {
  ALTCOIN_HISTORICAL: (days) =>
    `Fetching ${days} days of historical altcoin season data from database`,
  ALTCOIN_LATEST: "Fetching latest altcoin season data from database",
  ALTCOIN_ANALYSIS: (days) =>
    `Analyzing altcoin season data for the last ${days} days from database`,
  ALTCOIN_FORCE_UPDATE: "Admin requested force update of altcoin season data",
  ALTCOIN_UPDATE_SUCCESS: "Altcoin season data update triggered successfully",
};

module.exports = {
  SERVER,
  SERVICE,
  DATA,
  AUTH,
  CONTENT,
  CRYPTO,
  ERROR,
  DATABASE,
  SENTIMENT,
  FEEDBACK,
  ENTITY,
  ADMIN,
  ALTCOIN,
  ROUTES,
};
