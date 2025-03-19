// routes/admin.js
const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const { pool } = require("../config/db");
const { authorize, requireRole } = require("../middleware/authorize");
const { changeUserRole } = require("../services/authService");

// Get all users (admin only)
router.get("/users", authorize, requireRole(["admin"]), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.name, u.created_at, u.last_login, r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id
       ORDER BY u.created_at DESC`
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    logger.error("Error fetching users:", error);
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

    try {
      const result = await changeUserRole(userId, role);

      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.status(200).json({ message: "Role updated successfully" });
    } catch (error) {
      logger.error("Error changing user role:", error);
      return res.status(500).json({ error: "Failed to update role" });
    }
  }
);

module.exports = router;
