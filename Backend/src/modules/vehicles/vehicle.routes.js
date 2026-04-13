const express = require('express');
const router = express.Router();

const verifyToken = require('../../middleware/authMiddleware');
const allowRole = require('../../middleware/roleMiddleware');
const uploadVehicleImages = require('../../middleware/uploadVehicleImages');

const {
  addVehicle,
  addVehiclesBulk,
  listVehicles,
  updateVehicleById,
  changeVehicleStatus,
  removeVehicle,
  getVehicleSchedule,
  getAvailableVehicles,
  getVehicleTypeDetails,
  getVehicleAvailabilitySummary,
  getVehicleAvailabilityByType,
  getVehicleBookedDates
} = require('./vehicle.controller');

/**
 * @swagger
 * tags:
 *   name: Vehicles
 *   description: Vehicle management APIs
 */

/**
 * @swagger
 * /api/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of vehicles
 */
router.get(
  '/',
  verifyToken,
  listVehicles
);

/**
 * @swagger
 * /api/vehicles/available:
 *   get:
 *     summary: Get vehicles available for a specific date
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: date
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-04-01
 *     responses:
 *       200:
 *         description: List of available vehicles
 */
router.get(
  '/available',
  verifyToken,
  getAvailableVehicles
);

router.get(
  "/availability-summary",
  verifyToken,
  getVehicleAvailabilitySummary
);

router.get(
  "/availability-by-type",
  verifyToken,
  getVehicleAvailabilityByType
);

router.get(
  "/:id/booked-dates",
  verifyToken,
  getVehicleBookedDates
);

/**
 * @swagger
 * /api/vehicles:
 *   post:
 *     summary: Add a new vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_type:
 *                 type: string
 *               passenger_capacity:
 *                 type: integer
 *               registration_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: Vehicle added successfully
 */
router.post(
  '/',
  verifyToken,
  allowRole(['oic', 'approver']),
  uploadVehicleImages,
  addVehicle
);

router.post(
  '/bulk',
  verifyToken,
  allowRole(['oic', 'approver']),
  uploadVehicleImages,
  addVehiclesBulk
);


/**
 * @swagger
 * /api/vehicles/{id}/status:
 *   put:
 *     summary: Change vehicle availability status
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 */
router.patch(
  '/:id',
  verifyToken,
  allowRole(['oic', 'approver']),
  uploadVehicleImages,
  updateVehicleById
);

router.put(
  '/:id/status',
  verifyToken,
  allowRole(['oic', 'approver']),
  changeVehicleStatus
);

/**
 * @swagger
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Remove a vehicle
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  "/:id",
  verifyToken,
  allowRole(["oic", "approver"]),
  removeVehicle
);

/**
 * @swagger
 * /api/vehicles/{id}/schedule:
 *   get:
 *     summary: Get vehicle booking schedule
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/schedule",
  verifyToken,
  getVehicleSchedule
);

router.get(
  "/type/:type",
  getVehicleTypeDetails
);


module.exports = router;