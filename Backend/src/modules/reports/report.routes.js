const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/authMiddleware");
const allowRole = require("../../middleware/roleMiddleware");
const reportController = require("./report.controller");

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Fleet usage and analytics reports
 */

/**
 * @swagger
 * /api/reports/usage:
 *   get:
 *     summary: Get vehicle usage report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     description: Returns usage statistics of vehicles including bookings and utilization.
 *     responses:
 *       200:
 *         description: Usage report retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalBookings:
 *                   type: integer
 *                 totalVehicles:
 *                   type: integer
 *                 activeTrips:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (Approver role required)
 */
router.get(
  "/usage",
  verifyToken,
  allowRole("approver"),
  reportController.getReport
);

router.get(
  "/vehicle-types",
  verifyToken,
  allowRole("approver"),
  reportController.getVehicleTypes
);

module.exports = router;