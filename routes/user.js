// routes/user.js
const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const { pool } = require("../config/db");
const { authorize } = require("../middleware/authorize");

// Get user profile
router.get("/profile", authorize, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.name, u.picture, r.name as role
       FROM users u 
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    return res.status(200).json(user);
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile
router.put("/profile", authorize, async (req, res) => {
  const { name, username } = req.body;
  const updates = {};
  const params = [];

  let updateQuery = "UPDATE users SET ";
  let paramCounter = 1;

  if (name) {
    updates.name = name;
    updateQuery += `name = $${paramCounter++}, `;
    params.push(name);
  }

  if (username) {
    updates.username = username;
    updateQuery += `username = $${paramCounter++}, `;
    params.push(username);
  }

  // Remove trailing comma and space
  updateQuery = updateQuery.slice(0, -2);

  // Add WHERE clause and RETURNING
  updateQuery += ` WHERE id = $${paramCounter} RETURNING *`;
  params.push(req.user.id);

  // Only proceed if there are updates
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "No valid fields to update" });
  }

  try {
    const result = await pool.query(updateQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        username: result.rows[0].username,
        email: result.rows[0].email,
      },
    });
  } catch (error) {
    logger.error("Error updating user profile:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
