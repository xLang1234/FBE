const { OAuth2Client } = require("google-auth-library");
const logger = require("./logger");

// Initialize Google OAuth client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Verify Google token
async function verifyGoogleToken(token) {
  try {
    logger.debug("Verifying Google token");
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    logger.info("Google token verified successfully", {
      userId: payload.sub,
      email: payload.email,
    });
    return payload;
  } catch (error) {
    logger.error("Error verifying Google token:", error);
    return null;
  }
}

module.exports = {
  verifyGoogleToken,
  client,
};
