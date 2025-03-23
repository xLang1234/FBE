// routes/payment.js
const express = require("express");
const router = express.Router();
const logger = require("../config/logger");
const { pool } = require("../db/connection");
const { authorize } = require("../middleware/authorize");
const { changeUserRole } = require("../services/authService");

// Process payment and upgrade user to paid
router.post("/upgrade", authorize, async (req, res) => {
  // In a real implementation, you would integrate with a payment processor
  // For now, we'll just simulate a successful payment

  try {
    // Check if user is already on paid plan
    const userCheck = await pool.query(
      `SELECT r.name as role 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (userCheck.rows[0].role === "paid") {
      return res
        .status(400)
        .json({ error: "User already has a paid subscription" });
    }

    // Upgrade user to paid role
    const result = await changeUserRole(req.user.id, "paid");

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    // Record the payment (would typically include transaction ID, amount, etc.)
    await pool.query(
      `INSERT INTO payments (user_id, amount, status, created_at) 
       VALUES ($1, $2, 'completed', NOW())`,
      [req.user.id, 9.99] // Replace with actual subscription price
    );

    logger.info(`User ${req.user.id} upgraded to paid plan`);

    return res.status(200).json({
      success: true,
      message: "Successfully upgraded to paid plan",
    });
  } catch (error) {
    logger.error("Error processing payment:", error);
    return res.status(500).json({ error: "Failed to process payment" });
  }
});

module.exports = router;
