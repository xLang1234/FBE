// utils/coinmarketcapApiManager.js
const logger = require("../config/logger");

class CoinMarketCapApiManager {
  constructor() {
    // Load API keys
    this.apiKeys = this.loadApiKeys();
    this.currentKeyIndex = 0;

    if (!this.apiKeys.length) {
      logger.warn("No COINMARKETCAP_API_KEYs found in environment variables");
    } else {
      logger.info(`Loaded ${this.apiKeys.length} CoinMarketCap API keys`);
    }
  }

  // Load API keys from environment variables
  loadApiKeys() {
    const keys = [];

    // Primary key
    if (process.env.COINMARKETCAP_API_KEY) {
      keys.push(process.env.COINMARKETCAP_API_KEY);
    }

    // Additional keys (format: COINMARKETCAP_API_KEY_1, COINMARKETCAP_API_KEY_2, etc.)
    for (let i = 1; i <= 100; i++) {
      const keyName = `COINMARKETCAP_API_KEY_${i}`;
      if (process.env[keyName]) {
        keys.push(process.env[keyName]);
      }
    }

    return keys;
  }

  // Get the next API key in rotation
  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      logger.error("No API keys available");
      throw new Error("No API keys configured");
    }

    const apiKey = this.apiKeys[this.currentKeyIndex];

    // Move to the next key for the next request
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

    // Log which key index is being used (without exposing the actual key)
    logger.debug(
      `Using CoinMarketCap API key index: ${this.currentKeyIndex === 0 ? this.apiKeys.length - 1 : this.currentKeyIndex - 1}`
    );

    return apiKey;
  }
}

// Create a singleton instance
const coinMarketCapApiManager = new CoinMarketCapApiManager();

module.exports = coinMarketCapApiManager;
