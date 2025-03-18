// services/cryptoTelegramIntegration.js

const telegramService = require("./telegram");
const logger = require("../config/logger");

/**
 * Send a notification about significant crypto sentiment changes
 * @param {Object} sentiment - The sentiment data
 * @param {string} sentiment.symbol - Cryptocurrency symbol
 * @param {number} sentiment.score - Current sentiment score
 * @param {number} sentiment.previousScore - Previous sentiment score
 * @param {string} sentiment.trend - Trend direction (up, down, stable)
 */
async function notifySentimentChange(sentiment) {
  // Only notify on significant changes (customize this threshold as needed)
  const threshold = 0.15;
  const change = Math.abs(sentiment.score - sentiment.previousScore);

  if (change < threshold) {
    return;
  }

  try {
    const emoji =
      sentiment.trend === "up"
        ? "📈"
        : sentiment.trend === "down"
        ? "📉"
        : "➡️";
    const message = `
<b>Crypto Sentiment Alert ${emoji}</b>

<b>${sentiment.symbol}</b> sentiment has changed:
Previous: ${sentiment.previousScore.toFixed(2)}
Current: ${sentiment.score.toFixed(2)}
Change: ${(sentiment.score - sentiment.previousScore).toFixed(2)} (${(
      change * 100
    ).toFixed(1)}%)

<i>Generated on ${new Date().toLocaleString()}</i>
`;

    await telegramService.broadcastMessage(message);
    logger.info(`Sent sentiment notification for ${sentiment.symbol}`);
  } catch (error) {
    logger.error("Failed to send sentiment notification:", error);
  }
}

/**
 * Send a daily summary of crypto sentiments
 * @param {Array} sentiments - Array of sentiment data for different cryptocurrencies
 */
async function sendDailySummary(summary) {
  try {
    // Format the message
    const message = `
📊 *Daily Crypto Sentiment Summary* 📊
${new Date(summary.timestamp).toLocaleDateString()}

*Fear & Greed Index:* ${summary.fearGreedIndex.value} (${
      summary.fearGreedIndex.classification
    })

*Altcoin Season Index:* ${summary.altcoinSeasonIndex.value} (${
      summary.altcoinSeasonIndex.status
    })

*Top 5 Currencies by Sentiment:*
${summary.topCurrencies
  .map((c) => `- ${c.symbol}: ${c.score} ${c.direction} ${c.percentChange}%`)
  .join("\n")}

_Generated at ${new Date().toLocaleTimeString()}_
`;

    // Send to all subscribed users or channels
    const subscribers = await this.getSubscribers();
    for (const subscriber of subscribers) {
      await this.bot.sendMessage(subscriber.chatId, message, {
        parse_mode: "Markdown",
      });
    }

    logger.info("Daily summary sent to all subscribers");
    return true;
  } catch (error) {
    logger.error("Error sending Telegram summary:", error);
    return false;
  }
}

module.exports = {
  notifySentimentChange,
  sendDailySummary,
};
