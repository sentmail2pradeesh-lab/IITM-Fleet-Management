const express = require('express');
const router = express.Router();

const upload = require('../../utils/upload');
const pool = require('../../config/db');

const verifyToken = require('../../middleware/authMiddleware');
const allowRole = require('../../middleware/roleMiddleware');
const validate = require("../../middleware/validate");
const asyncHandler = require("../../middleware/asyncHandler");

const {
  bookVehicle,
  viewPending,
  viewGuidePending,
  viewUpcoming,
  guideApprove,
  guideReject,
  approve,
  supervisorAllot,
  reject,
  requestCancellation,
  assignDriver,
  reassignVehicle,
  reportIssue,
  listMyBookings,
  listAllBookings,
  getBookingById,
  getBookingFlow
} = require('./booking.controller');

const {
  createBookingSchema,
  assignDriverSchema,
  supervisorAllotSchema,
  cancellationSchema
} = require("../../validators/booking.validator");

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Vehicle booking APIs
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new vehicle booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               vehicle_id:
 *                 type: integer
 *               start_time:
 *                 type: string
 *               end_time:
 *                 type: string
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post(
  '/',
  verifyToken,
  allowRole('requester'),
  validate(createBookingSchema),
  upload.single('document'),
  bookVehicle
);

/**
 * @swagger
 * /api/bookings/pending:
 *   get:
 *     summary: Get all pending bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending bookings
 */
router.get(
  '/pending',
  verifyToken,
  allowRole(['oic', 'approver', 'supervisor']),
  viewPending
);

router.get(
  "/upcoming",
  verifyToken,
  allowRole(["oic", "approver", "supervisor"]),
  viewUpcoming
);

router.get(
  "/guide-pending",
  verifyToken,
  allowRole("guide_hod"),
  viewGuidePending
);

// Requester booking history
router.get(
  "/my",
  verifyToken,
  allowRole("requester"),
  listMyBookings
);

// Approver booking history / filters
router.get(
  "/",
  verifyToken,
  allowRole(["oic", "approver", "supervisor"]),
  listAllBookings
);

// Booking details (requester own OR approver any)
router.get(
  "/:id",
  verifyToken,
  asyncHandler(getBookingById)
);

router.get(
  "/:id/flow",
  verifyToken,
  allowRole(["oic", "approver", "supervisor", "guide_hod", "requester"]),
  asyncHandler(getBookingFlow)
);

/**
 * @swagger
 * /api/bookings/{id}/approve:
 *   patch:
 *     summary: Approve a booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking approved successfully
 */
router.patch(
  '/:id/guide-approve',
  verifyToken,
  allowRole('guide_hod'),
  guideApprove
);

router.patch(
  '/:id/guide-reject',
  verifyToken,
  allowRole('guide_hod'),
  guideReject
);

router.patch(
  "/:id/approve",
  verifyToken,
  allowRole(["oic", "approver"]),
  approve
);

router.put(
  "/:id/supervisor-allot",
  verifyToken,
  allowRole("supervisor"),
  validate(supervisorAllotSchema),
  asyncHandler(supervisorAllot)
);

/**
 * @swagger
 * /api/bookings/{id}/reject:
 *   patch:
 *     summary: Reject a booking request
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Booking rejected
 */
router.patch(
  "/:id/reject",
  verifyToken,
  allowRole(["oic", "approver", "supervisor"]),
  reject
);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: Request cancellation of booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cancellation request submitted
 */
router.patch(
  '/:id/cancel',
  verifyToken,
  allowRole('requester'),
  validate(cancellationSchema),
  requestCancellation
);

/**
 * @swagger
 * /api/bookings/{id}/assign:
 *   put:
 *     summary: Assign driver to booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Driver assigned successfully
 */
router.put(
  "/:id/assign",
  verifyToken,
  allowRole("supervisor"),
  validate(assignDriverSchema),
  assignDriver
);

/**
 * @swagger
 * /api/bookings/{id}/reassign:
 *   patch:
 *     summary: Reassign vehicle or driver
 *     tags: [Bookings]
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
  "/:id/reassign",
  verifyToken,
  allowRole("supervisor"),
  asyncHandler(reassignVehicle)
);

router.patch(
  "/:id/report-issue",
  verifyToken,
  allowRole("supervisor"),
  asyncHandler(reportIssue)
);

module.exports = router;