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
};

module.exports = {
  SERVER,
  SERVICE,
  DATA,
  AUTH,
  CONTENT,
  CRYPTO,
  ERROR,
};
