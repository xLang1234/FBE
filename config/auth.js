const { OAuth2Client } = require("google-auth-library");
const logger = require("./logger");
const { AUTH } = require("../constants/logMessages");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  try {
    logger.debug(AUTH.GOOGLE_TOKEN_VERIFY);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    logger.info(AUTH.GOOGLE_TOKEN_VERIFIED, {
      userId: payload.sub,
      email: payload.email,
    });
    return payload;
  } catch (error) {
    logger.error(AUTH.GOOGLE_TOKEN_ERROR, error);
    return null;
  }
}

module.exports = {
  verifyGoogleToken,
  client,
};
