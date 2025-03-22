const logger = require("../config/logger");

class CoinMarketCapApiManager {
  constructor() {
    this.apiKeys = this.loadApiKeys();
    this.currentKeyIndex = 0;

    if (!this.apiKeys.length) {
      logger.warn("No COINMARKETCAP_API_KEYs found in environment variables");
    } else {
      logger.info(`Loaded ${this.apiKeys.length} CoinMarketCap API keys`);
    }
  }

  loadApiKeys() {
    const keys = [];

    if (process.env.COINMARKETCAP_API_KEY) {
      keys.push(process.env.COINMARKETCAP_API_KEY);
    }

    for (let i = 1; i <= 100; i++) {
      const keyName = `COINMARKETCAP_API_KEY_${i}`;
      if (process.env[keyName]) {
        keys.push(process.env[keyName]);
      }
    }

    return keys;
  }

  getNextApiKey() {
    if (this.apiKeys.length === 0) {
      logger.error("No API keys available");
      throw new Error("No API keys configured");
    }

    const apiKey = this.apiKeys[this.currentKeyIndex];

    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

    logger.debug(
      `Using CoinMarketCap API key index: ${this.currentKeyIndex === 0 ? this.apiKeys.length - 1 : this.currentKeyIndex - 1}`
    );

    return apiKey;
  }
}

const coinMarketCapApiManager = new CoinMarketCapApiManager();

module.exports = coinMarketCapApiManager;
