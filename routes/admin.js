// routes/admin.js
const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const { pool } = require("../db/connection");
const { authorize, requireRole } = require("../middleware/authorize");
const { changeUserRole } = require("../services/authService");
const { ADMIN, ERROR } = require("../constants/logMessages");

// Get all users (admin only)
router.get("/users", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    logger.info(ADMIN.FETCH_USERS);
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.name, u.created_at, u.last_login, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    logger.error(ERROR.FETCH_USERS, error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Change user role (admin only)
router.put(
  "/users/:userId/role",
  authorize,
  requireRole(["admin"]),
  async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required" });
    }

    logger.info(ADMIN.ROLE_CHANGE_REQUEST(userId, role));

    try {
      const result = await changeUserRole(userId, role);

      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.status(200).json({ message: ADMIN.ROLE_CHANGE_SUCCESS });
    } catch (error) {
      logger.error(ERROR.ROLE_CHANGE, error);
      return res.status(500).json({ error: "Failed to update role" });
    }
  }
);

module.exports = router;
