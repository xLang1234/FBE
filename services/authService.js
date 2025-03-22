const bcrypt = require("bcrypt");
const logger = require("../config/logger");
const LOG = require("../constants/logMessages");
const { pool } = require("../config/db");
const { createSession } = require("../utils/sessionUtils");
const { verifyGoogleToken } = require("../config/auth");

async function saveGoogleUser(userData) {
  const { sub, email, name, picture } = userData;

  try {
    logger.debug(LOG.AUTH.GOOGLE_CHECK, { googleId: sub });

    const checkResult = await pool.query(
      "SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.google_id = $1",
      [sub]
    );

    if (checkResult.rows.length > 0) {
      logger.info(LOG.AUTH.GOOGLE_UPDATE, { googleId: sub, email });

      const updateResult = await pool.query(
        "UPDATE users SET email = $1, name = $2, picture = $3, last_login = NOW() WHERE google_id = $4 RETURNING *",
        [email, name, picture, sub]
      );

      const roleResult = await pool.query(
        "SELECT r.name FROM roles r JOIN users u ON r.id = u.role_id WHERE u.id = $1",
        [updateResult.rows[0].id]
      );

      const user = {
        ...updateResult.rows[0],
        role: roleResult.rows[0].name,
      };

      logger.debug(LOG.AUTH.GOOGLE_SUCCESS, {
        userId: user.id,
        googleId: sub,
        role: user.role,
      });

      return user;
    } else {
      const emailCheckResult = await pool.query(
        "SELECT u.*, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1",
        [email]
      );

      if (emailCheckResult.rows.length > 0) {
        logger.info(LOG.AUTH.GOOGLE_LINK, { email, googleId: sub });

        const linkResult = await pool.query(
          "UPDATE users SET google_id = $1, picture = $2, last_login = NOW() WHERE email = $3 RETURNING *",
          [sub, picture, email]
        );

        const user = {
          ...linkResult.rows[0],
          role: emailCheckResult.rows[0].role_name,
        };

        return user;
      } else {
        logger.info(LOG.AUTH.GOOGLE_CREATE, { googleId: sub, email });

        const basicRoleId = 1;

        const insertResult = await pool.query(
          "INSERT INTO users (google_id, email, name, picture, role_id, created_at, last_login) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *",
          [sub, email, name, picture, basicRoleId]
        );

        const user = {
          ...insertResult.rows[0],
          role: "basic",
        };

        logger.debug(LOG.AUTH.GOOGLE_CREATE_SUCCESS, {
          userId: user.id,
          googleId: sub,
          role: user.role,
        });

        return user;
      }
    }
  } catch (error) {
    logger.error(LOG.ERROR.DATABASE, error, { googleId: sub });
    throw error;
  }
}

async function processGoogleSignIn(token) {
  const payload = await verifyGoogleToken(token);

  if (!payload) {
    logger.warn(LOG.AUTH.GOOGLE_INVALID);
    return null;
  }

  const user = await saveGoogleUser(payload);
  const sessionToken = await createSession(user.id);

  logger.info(LOG.AUTH.LOGIN_SUCCESS, {
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role,
    },
    sessionToken,
  };
}

async function processSignup(username, email, password) {
  if (!username || !email || !password) {
    logger.warn(LOG.AUTH.INCOMPLETE_DATA);
    return { error: "All fields are required", status: 400 };
  }

  const emailCheck = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (emailCheck.rows.length > 0) {
    logger.warn(LOG.AUTH.EMAIL_TAKEN, { email });
    return { error: "Email already in use", status: 400 };
  }

  const usernameCheck = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  if (usernameCheck.rows.length > 0) {
    logger.warn(LOG.AUTH.USERNAME_TAKEN, { username });
    return { error: "Username already taken", status: 400 };
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const basicRoleId = 1;

  const result = await pool.query(
    "INSERT INTO users (username, email, password_hash, name, role_id, created_at, last_login) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *",
    [username, email, hashedPassword, username, basicRoleId]
  );

  const user = result.rows[0];
  const sessionToken = await createSession(user.id);

  logger.info(LOG.AUTH.SIGNUP_SUCCESS, { userId: user.id, email });

  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: "basic",
    },
    sessionToken,
  };
}

async function processLogin(email, password) {
  const result = await pool.query(
    `SELECT u.*, r.name as role_name 
     FROM users u 
     JOIN roles r ON u.role_id = r.id 
     WHERE u.email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    logger.warn(LOG.AUTH.INVALID_EMAIL, { email });
    return { error: "Invalid credentials", status: 401 };
  }

  const user = result.rows[0];

  if (!user.password_hash) {
    logger.warn(LOG.AUTH.GOOGLE_ONLY, { email });
    return { error: "Please login with Google", status: 401 };
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    logger.warn(LOG.AUTH.INCORRECT_PASSWORD, { email });
    return { error: "Invalid credentials", status: 401 };
  }

  await pool.query("UPDATE users SET last_login = NOW() WHERE id = $1", [
    user.id,
  ]);

  const sessionToken = await createSession(user.id);

  logger.info(LOG.AUTH.LOGIN_SUCCESS, {
    userId: user.id,
    email,
    role: user.role_name,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      picture: user.picture,
      role: user.role_name,
    },
    sessionToken,
  };
}

async function changeUserRole(userId, roleName) {
  try {
    const roleResult = await pool.query(
      "SELECT id FROM roles WHERE name = $1",
      [roleName]
    );

    if (roleResult.rows.length === 0) {
      logger.warn(LOG.AUTH.INVALID_ROLE, { roleName });
      return { error: "Invalid role", status: 400 };
    }

    const roleId = roleResult.rows[0].id;

    await pool.query("UPDATE users SET role_id = $1 WHERE id = $2", [
      roleId,
      userId,
    ]);

    logger.info(LOG.AUTH.ROLE_UPDATED, {
      userId,
      newRole: roleName,
    });

    return { success: true };
  } catch (error) {
    logger.error(LOG.ERROR.ROLE_CHANGE, error);
    throw error;
  }
}

module.exports = {
  saveGoogleUser,
  processGoogleSignIn,
  processSignup,
  processLogin,
  changeUserRole,
};
