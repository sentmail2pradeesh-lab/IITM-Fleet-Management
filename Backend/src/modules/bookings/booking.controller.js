const {
  createBooking,
  getPendingBookings,
  getUpcomingBookings
} = require('./booking.service');

const pool = require('../../config/db');
const availabilityService = require('../../services/availabilityService');
const emailService = require("../../config/email");
const smsNotificationService = require("../../services/smsNotificationService");
const { isValidTransition } = require("../../utils/bookingStateValidator");
const { logAction } = require("../../utils/auditLogger");


const bookVehicle = async (req, res, next) => {
  try {
    const {
      vehicle_id,
      start_time,
      end_time,
      pickup_location,
      drop_location
    } = req.body;

    // Check availability
    const available = await availabilityService.isVehicleAvailable(
      vehicle_id,
      start_time,
      end_time
    );

    if (!available) {
      return res.status(400).json({
        error: "Vehicle not available with buffer time"
      });
    }

    const filePath = req.file ? req.file.path : null;

    // Create booking
    const booking = await createBooking(
      req.body,
      req.user.id,
      filePath
    );

    // Fetch user details
    const userResult = await pool.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0];

    // Send Email to User
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Booking Request Submitted",
        text: `
Dear ${user.name},

Your booking request has been submitted.

Vehicle ID: ${vehicle_id}
Start Time: ${start_time}
End Time: ${end_time}
Pickup: ${pickup_location}
Drop: ${drop_location}

Status: Pending Guide Approval

Regards,
IITM Transport System
        `
      });

      // Send Email to Guide / HoD (first-level approval)
      await emailService.sendEmail({
        to: process.env.HOD_EMAIL || process.env.APPROVER_EMAIL,
        subject: "New Booking Request - Guide/HoD Approval Required",
        text: `
New booking request submitted.

User: ${user.name}
Email: ${user.email}
Vehicle ID: ${vehicle_id}
Start: ${start_time}
End: ${end_time}
Pickup: ${pickup_location}
Drop: ${drop_location}

Please review and approve/reject at Guide/HoD level.
        `
      });

    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
    }

    res.status(201).json(booking);

  } catch (err) {
    next(err);
  }
};

const viewPending = async (req, res, next) => {
  try {
    const role = req.user?.role === "approver" ? "oic" : req.user?.role;

    // Role-scoped pending queue:
    // - Guide/HoD has its own endpoint.
    // - Supervisor: only items that still need supervisor action (Guide Approved, cancellation requests, or incomplete Pending OIC Approval).
    // - OIC: only Pending OIC Approval.
    let where = "";
    if (role === "supervisor") {
      where = `
        WHERE (
          b.status IN ('Guide Approved', 'Cancellation Requested')
          OR (
            b.status = 'Pending OIC Approval'
            AND (
              b.driver_name IS NULL
              OR LENGTH(TRIM(COALESCE(b.driver_name, ''))) = 0
              OR b.driver_phone IS NULL
              OR LENGTH(TRIM(COALESCE(b.driver_phone, ''))) = 0
            )
          )
        )
      `;
    } else if (role === "oic") {
      where = `WHERE b.status = 'Pending OIC Approval'`;
    } else {
      // Default safe behavior: return none for other roles.
      where = `WHERE 1 = 0`;
    }

    const result = await pool.query(
      `SELECT b.*, u.name, u.email, v.vehicle_type, v.passenger_capacity
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       ${where}
       ORDER BY b.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const viewGuidePending = async (req, res, next) => {
  try {
    // Show guide approvals + cancellation requests in one pending queue
    const result = await pool.query(
      `SELECT b.*, u.name, u.email, v.vehicle_type, v.passenger_capacity
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.status IN ('Pending Guide Approval', 'Cancellation Requested')
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const guideApprove = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const remarks = String(req.body?.remarks || "").trim();
    const bookingData = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (bookingData.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const booking = bookingData.rows[0];
    if (booking.status !== "Pending Guide Approval") {
      return res.status(400).json({
        message: `Cannot guide-approve booking in ${booking.status} state`
      });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = 'Guide Approved'
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );
    const updatedBooking = result.rows[0];

    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: "GUIDE_APPROVED",
      oldStatus: booking.status,
      newStatus: "Guide Approved",
      ip: req.ip,
      remarks
    });

    const userResult = await pool.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [updatedBooking.user_id]
    );
    const user = userResult.rows[0];
    const supervisorEmail = process.env.SUPERVISOR_EMAIL || process.env.APPROVER_EMAIL;

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Booking approved by Guide/HoD",
        text: `Dear ${user.name},\n\nYour booking has been approved by Guide/HoD and sent to Transport Cell Supervisor for allotment.\n\nBooking ID: ${updatedBooking.id}\nVehicle ID: ${updatedBooking.vehicle_id}\nStart: ${updatedBooking.start_time}\nEnd: ${updatedBooking.end_time}\n\nRegards,\nIITM Fleet`
      });
      if (supervisorEmail) {
        await emailService.sendEmail({
          to: supervisorEmail,
          subject: "Guide/HoD approved booking - action required",
          text: `Booking ID: ${updatedBooking.id}\nRequester: ${user.name} (${user.email})\nVehicle ID: ${updatedBooking.vehicle_id}\nStart: ${updatedBooking.start_time}\nEnd: ${updatedBooking.end_time}\n\nPlease allot vehicle/driver in supervisor dashboard.`
        });
      }
    } catch (emailError) {
      console.error("Guide approval email failed:", emailError.message);
    }

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
};

const guideReject = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const remarks = String(req.body?.remarks || "").trim();
    if (!remarks) {
      return res.status(400).json({ message: "Remarks are required for rejection" });
    }
    const bookingData = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );
    if (bookingData.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const booking = bookingData.rows[0];
    if (booking.status !== "Pending Guide Approval") {
      return res.status(400).json({
        message: `Cannot guide-reject booking in ${booking.status} state`
      });
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = 'Rejected',
           rejection_reason = $2
       WHERE id = $1
       RETURNING *`,
      [bookingId, remarks]
    );
    const updatedBooking = result.rows[0];

    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: "GUIDE_REJECTED",
      oldStatus: booking.status,
      newStatus: "Rejected",
      ip: req.ip,
      remarks
    });

    const userResult = await pool.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [updatedBooking.user_id]
    );
    const user = userResult.rows[0];
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Booking rejected by Guide/HoD",
        text: `Dear ${user.name},\n\nYour booking request has been rejected at Guide/HoD level.\n\nBooking ID: ${updatedBooking.id}\nRemarks: ${remarks}\n\nRegards,\nIITM Fleet`
      });
    } catch (emailError) {
      console.error("Guide rejection email failed:", emailError.message);
    }

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
};

const viewUpcoming = async (req, res, next) => {
  try {
    const bookings = await getUpcomingBookings();
    res.json(bookings);
  } catch (err) {
    next(err);
  }
};

const approve = async (req, res, next) => {
  const client = await pool.connect();

  try {
    const bookingId = req.params.id;
    const remarks = String(req.body?.remarks || "").trim();
    const actorRole = req.user?.role === "approver" ? "oic" : req.user?.role;

    if (actorRole !== "oic") {
      return res.status(403).json({
        message:
          "Only Officer In-charge can use this action. Supervisors must allot vehicle and driver via the supervisor allotment flow."
      });
    }

    await client.query("BEGIN");

    const bookingData = await client.query(
      `SELECT * FROM bookings WHERE id = $1 FOR UPDATE`,
      [bookingId]
    );

    if (bookingData.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingData.rows[0];

    if (booking.status !== "Pending OIC Approval") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `OIC can only approve bookings awaiting OIC sign-off (Pending OIC Approval). Current status: ${booking.status}`
      });
    }

    if (!String(booking.driver_name || "").trim() || !String(booking.driver_phone || "").trim()) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Supervisor must allot vehicle and driver before OIC can approve."
      });
    }

    const available = await availabilityService.isVehicleAvailable(
      booking.vehicle_id,
      booking.start_time,
      booking.end_time
    );

    if (!available) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message: "Vehicle not available due to buffer conflict"
      });
    }

    const result = await client.query(
      `UPDATE bookings
       SET status = 'Assigned'
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );

    await client.query(`UPDATE vehicles SET status = 'Booked' WHERE id = $1`, [
      booking.vehicle_id
    ]);

    await client.query("COMMIT");

    const updatedBooking = result.rows[0];

    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: "OIC_APPROVED_ASSIGNED",
      oldStatus: booking.status,
      newStatus: "Assigned",
      ip: req.ip,
      remarks
    });

    const userResult = await pool.query(
      `SELECT name, email, phone FROM users WHERE id = $1`,
      [updatedBooking.user_id]
    );
    const user = userResult.rows[0];
    const driverName = updatedBooking.driver_name;
    const driverPhone = updatedBooking.driver_phone;

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Booking confirmed by Officer In-charge",
        text: `
Dear ${user.name},

Your booking has been approved by the Officer In-charge. Driver and vehicle are confirmed.

Driver: ${driverName}
Phone: ${driverPhone}

Vehicle ID: ${updatedBooking.vehicle_id}
Pickup: ${updatedBooking.pickup_location}
Drop: ${updatedBooking.drop_location}
Start: ${updatedBooking.start_time}
End: ${updatedBooking.end_time}

Regards,
IITM Transport System
        `
      });
    } catch (emailError) {
      console.error("OIC approval email failed:", emailError.message);
    }

    try {
      await smsNotificationService.sendDriverBookingConfirmedSMS({
        booking: updatedBooking,
        requester: user,
        driver: { name: driverName, phone: driverPhone }
      });
    } catch (smsError) {
      console.error("Driver SMS (booking confirmed) failed:", smsError.message);
    }

    res.json(updatedBooking);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
};

const supervisorAllot = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { vehicle_id: bodyVehicleId, driver_name, driver_phone, remarks } = req.body;

    const bookingData = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [
      bookingId
    ]);
    if (bookingData.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const booking = bookingData.rows[0];

    const canAllotFromGuide = booking.status === "Guide Approved";
    const canFillPendingOic =
      booking.status === "Pending OIC Approval" &&
      (!String(booking.driver_name || "").trim() ||
        !String(booking.driver_phone || "").trim());

    if (!canAllotFromGuide && !canFillPendingOic) {
      return res.status(400).json({
        message: `Supervisor cannot allot in ${booking.status}. Use pending Guide Approved requests, or complete missing driver details on Pending OIC Approval rows.`
      });
    }

    if (canAllotFromGuide && !isValidTransition(booking.status, "Pending OIC Approval")) {
      return res.status(400).json({ message: "Invalid state transition" });
    }

    const nextVehicleId =
      bodyVehicleId != null && bodyVehicleId !== ""
        ? Number(bodyVehicleId)
        : booking.vehicle_id;

    if (!Number.isFinite(nextVehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle" });
    }

    const vehicleResult = await pool.query(
      `SELECT passenger_capacity, vehicle_type FROM vehicles WHERE id = $1`,
      [nextVehicleId]
    );
    if (vehicleResult.rowCount === 0) {
      return res.status(400).json({ message: "Selected vehicle does not exist" });
    }

    const capacity = vehicleResult.rows[0].passenger_capacity;
    const vehicleType = String(vehicleResult.rows[0].vehicle_type || "");
    if (booking.passenger_count > capacity) {
      return res.status(400).json({
        message: `Passenger count (${booking.passenger_count}) exceeds vehicle capacity (${capacity})`
      });
    }
    if (vehicleType.toLowerCase().includes("cart") && booking.campus_type === "outside") {
      return res.status(400).json({ message: "Cart booking is only allowed for Inside IITM trips" });
    }

    const available = await availabilityService.isVehicleAvailable(
      nextVehicleId,
      booking.start_time,
      booking.end_time
    );
    if (!available) {
      return res.status(409).json({
        message: "Vehicle not available for the selected time window"
      });
    }

    const nextStatus = canAllotFromGuide ? "Pending OIC Approval" : booking.status;

    const result = await pool.query(
      `UPDATE bookings
       SET vehicle_id = $1,
           driver_name = $2,
           driver_phone = $3,
           status = $4
       WHERE id = $5
         AND (
           status = 'Guide Approved'
           OR (
             status = 'Pending OIC Approval'
             AND (
               driver_name IS NULL
               OR LENGTH(TRIM(COALESCE(driver_name, ''))) = 0
               OR driver_phone IS NULL
               OR LENGTH(TRIM(COALESCE(driver_phone, ''))) = 0
             )
           )
         )
       RETURNING *`,
      [
        nextVehicleId,
        String(driver_name).trim(),
        String(driver_phone).trim(),
        nextStatus,
        bookingId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Could not update booking (state changed?)" });
    }

    const updatedBooking = result.rows[0];

    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: canAllotFromGuide ? "SUPERVISOR_ALLOTMENT" : "SUPERVISOR_ALLOTMENT_UPDATE",
      oldStatus: booking.status,
      newStatus: updatedBooking.status,
      ip: req.ip,
      remarks
    });

    const userResult = await pool.query(`SELECT name, email FROM users WHERE id = $1`, [
      updatedBooking.user_id
    ]);
    const user = userResult.rows[0];
    const oicEmail = process.env.OIC_EMAIL || process.env.APPROVER_EMAIL;

    try {
      if (oicEmail) {
        await emailService.sendEmail({
          to: oicEmail,
          subject: "Fleet booking – OIC approval required (vehicle & driver allotted)",
          text: `Supervisor has allotted vehicle and driver. OIC approval is required.

Booking ID: ${updatedBooking.id}
Requester: ${user.name} (${user.email})
Vehicle ID: ${updatedBooking.vehicle_id}
Driver: ${updatedBooking.driver_name} (${updatedBooking.driver_phone})
Start: ${updatedBooking.start_time}
End: ${updatedBooking.end_time}

Please review and approve in the OIC dashboard.
`
        });
      }
    } catch (emailError) {
      console.error("OIC notify email failed:", emailError.message);
    }

    res.json(updatedBooking);
  } catch (err) {
    next(err);
  }
};

const reject = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    const bookingData = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingData.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingData.rows[0];
    let newStatus = 'Rejected';
    if (
      ![
        "Guide Approved",
        "Approved",
        "Pending OIC Approval",
        "Cancellation Requested"
      ].includes(booking.status)
    ) {
      return res.status(400).json({
        message: `Cannot reject booking in ${booking.status} state`
      });
    }


    if (booking.status === 'Cancellation Requested') {
      newStatus = 'Cancelled';

      await pool.query(
        `UPDATE vehicles SET status = 'Available' WHERE id = $1`,
        [booking.vehicle_id]
      );
    }

    const result = await pool.query(
      `UPDATE bookings
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [newStatus, bookingId]
    );

    const updatedBooking = result.rows[0];

    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: "BOOKING_REJECTED",
      oldStatus: booking.status,
      newStatus: newStatus,
      ip: req.ip
    });

    // Fetch user
    const userResult = await pool.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [updatedBooking.user_id]
    );

    const user = userResult.rows[0];

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Your Booking Has Been Rejected",
        text: `
Dear ${user.name},

Your booking request has been ${newStatus}.

Vehicle ID: ${updatedBooking.vehicle_id}
Start Time: ${updatedBooking.start_time}
End Time: ${updatedBooking.end_time}

For clarification, please contact transport office.

Regards,
IITM Transport System
        `
      });
    } catch (emailError) {
      console.error("Rejection email failed:", emailError.message);
    }

    res.json(updatedBooking);

  } catch (err) {
    next(err);
  }
};

const assignDriver = async (req, res, next) => {
  try {
    const actorRole = req.user?.role === "approver" ? "oic" : req.user?.role;
    if (actorRole !== "supervisor") {
      return res.status(403).json({ message: "Only Transport Supervisor can assign drivers" });
    }

    const bookingId = req.params.id;
    const { driver_name, driver_phone, remarks } = req.body;

    // Fetch booking first
    const bookingData = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingData.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const booking = bookingData.rows[0];

    if (!isValidTransition(booking.status, "Assigned")) {
      return res.status(400).json({
        message: `Cannot assign driver when booking is ${booking.status}`
      });
    }

    const result = await pool.query(
      `UPDATE bookings
      SET driver_name = $1,
          driver_phone = $2,
          status = 'Assigned'
      WHERE id = $3
      RETURNING *`,
      [driver_name, driver_phone, bookingId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }


    // 📧 Email to user
    const userResult = await pool.query(
      `SELECT name, email FROM users WHERE id = $1`,
      [booking.user_id]
    );

    const user = userResult.rows[0];

    try {
      await emailService.sendEmail({
        to: user.email,
        subject: "Driver Assigned",
        text: `
Dear ${user.name},

Driver has been assigned.

Driver: ${driver_name}
Phone: ${driver_phone}

Trip Details:
Pickup: ${booking.pickup_location}
Drop: ${booking.drop_location}
Start: ${booking.start_time}
        `
      });

      if (process.env.ADMIN_EMAIL) {
        // Stage 4 summary: only after HOD approved (Stage 2) AND supervisor assigned vehicle/driver (Stage 3/4).
        // We enrich the summary using audit logs (who approved at Guide/HoD stage).
        const hodLog = await pool.query(
          `SELECT performed_by
           FROM audit_logs
           WHERE booking_id = $1 AND action = 'GUIDE_APPROVED'
           ORDER BY id DESC
           LIMIT 1`,
          [bookingId]
        );

        let hodName = "-";
        let hodEmail = "-";
        const hodId = hodLog.rows?.[0]?.performed_by;
        if (hodId) {
          const hodUserRes = await pool.query(
            `SELECT name, email FROM users WHERE id = $1`,
            [hodId]
          );
          hodName = hodUserRes.rows?.[0]?.name || "-";
          hodEmail = hodUserRes.rows?.[0]?.email || "-";
        }

        const vehicleRes = await pool.query(
          `SELECT vehicle_type, passenger_capacity, registration_number
           FROM vehicles
           WHERE id = $1`,
          [booking.vehicle_id]
        );
        const vehicle = vehicleRes.rows?.[0];

        const adminSummaryText = `Full Booking Summary (Stage 4)

- Booking ID: ${bookingId}
- Requester: ${user.name} (${user.email})
- Purpose: ${booking.purpose || "-"}
- Travel Dates: ${booking.start_time} → ${booking.end_time}
- Uploaded Document: ${booking.document_url || "-"}
- HOD Approved By: ${hodName} (${hodEmail})
- Vehicle Assigned: ${vehicle?.vehicle_type || booking.vehicle_type || "-"} (Vehicle ID: ${booking.vehicle_id || "-"})
- Driver Assigned: ${driver_name} (${driver_phone})

Regards,
IITM Fleet`;

        await emailService.sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: "Booking Summary - Admin (Vehicle & Driver Assigned)",
          text: adminSummaryText
        });
      }
    } catch (emailError) {
      console.error("Email failed:", emailError.message);
    }
    const updatedBooking = result.rows[0];

    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: "DRIVER_ASSIGNED",
      oldStatus: booking.status,
      newStatus: "Assigned",
      ip: req.ip,
      remarks
    });


    res.json(result.rows[0]);

  } catch (err) {
    next(err);
  }
};


const requestCancellation = async (req, res, next) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;

    // 1️⃣ Fetch booking first
    const bookingData = await pool.query(
      `SELECT * FROM bookings WHERE id = $1`,
      [bookingId]
    );

    if (bookingData.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingData.rows[0];

    // 2️⃣ Ensure the user owns this booking
    if (booking.user_id !== req.user.id) {
      return res.status(403).json({
        message: "You are not allowed to cancel this booking"
      });
    }

    // 3️⃣ Prevent cancellation after trip started or completed
    if (booking.status === "In Progress" || booking.status === "Completed") {
      return res.status(400).json({
        message: "Trip already started. Cancellation not allowed."
      });
    }

    // 4️⃣ Validate state transition
    if (!isValidTransition(booking.status, "Cancellation Requested")) {
      return res.status(400).json({
        message: `Cannot request cancellation when booking is ${booking.status}`
      });
    }

    // 5️⃣ Update booking
    const result = await pool.query(
      `UPDATE bookings
       SET status = 'Cancellation Requested',
           cancellation_reason = $1
       WHERE id = $2
       RETURNING *`,
      [reason, bookingId]
    );

    const updatedBooking = result.rows[0];

    // 6️⃣ Audit log
    await logAction({
      bookingId: updatedBooking.id,
      performedBy: req.user.id,
      action: "CANCELLATION_REQUESTED",
      oldStatus: booking.status,
      newStatus: "Cancellation Requested",
      ip: req.ip
    });

    res.json(updatedBooking);

  } catch (err) {
    next(err);
  }
};

const reassignVehicle = async (req, res) => {
  const actorRole = req.user?.role === "approver" ? "oic" : req.user?.role;
  if (actorRole !== "supervisor") {
    return res.status(403).json({ message: "Only Transport Supervisor can reassign vehicles" });
  }

  const bookingId = req.params.id;
  const { vehicle_id } = req.body;

  const bookingResult = await pool.query(
    `SELECT b.*, u.name, u.email, v.vehicle_type
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.id = $1`,
    [bookingId]
  );
  if (bookingResult.rowCount === 0) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const booking = bookingResult.rows[0];
  // Only allow reassignment when Assigned or Delayed
  if (!["Assigned", "Delayed"].includes(booking.status)) {
    return res.status(400).json({
      message: `Cannot reassign vehicle when booking is ${booking.status}`
    });
  }

  // Update booking: new vehicle + reset to Approved and clear driver (must assign again)
  const result = await pool.query(
    `UPDATE bookings
     SET vehicle_id = $1,
         status = 'Approved',
         driver_name = NULL,
         driver_phone = NULL,
         issue_text = NULL,
         issue_reported_at = NULL
     WHERE id = $2
     RETURNING *`,
    [vehicle_id, bookingId]
  );

  // Old vehicle becomes unavailable (it caused delay/issue)
  await pool.query(
    `UPDATE vehicles SET status = 'Unavailable' WHERE id = $1`,
    [booking.vehicle_id]
  );
  // New vehicle is reserved
  await pool.query(
    `UPDATE vehicles SET status = 'Booked' WHERE id = $1`,
    [vehicle_id]
  );

  // Notify requester
  try {
    await emailService.sendEmail({
      to: booking.email,
      subject: "Vehicle reassigned – action required",
      text: `Dear ${booking.name},\n\nYour booking has been reassigned to a new vehicle due to delay/issue.\n\nBooking ID: ${booking.id}\nVehicle type: ${booking.vehicle_type}\nNew vehicle ID: ${vehicle_id}\nStart: ${booking.start_time}\nEnd: ${booking.end_time}\n\nDriver will be assigned shortly.\n\nRegards,\nIITM Fleet`
    });
  } catch (e) {
    console.error("Reassign notify email failed:", e.message);
  }

  res.json({
    message: "Vehicle reassigned successfully. Booking reset to Approved (assign driver again).",
    booking: result.rows[0]
  });

};

const listMyBookings = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT b.*, v.vehicle_type, v.passenger_capacity
       FROM bookings b
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const listAllBookings = async (req, res, next) => {
  try {
    const { from, to, status, vehicle_id, vehicle_type } = req.query;

    const conditions = [];
    const values = [];

    if (from) {
      values.push(from);
      conditions.push(`b.start_time >= $${values.length}`);
    }
    if (to) {
      values.push(to);
      conditions.push(`b.end_time <= $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`b.status = $${values.length}`);
    }
    if (vehicle_id) {
      values.push(vehicle_id);
      conditions.push(`b.vehicle_id = $${values.length}`);
    }
    if (vehicle_type) {
      values.push(`%${vehicle_type}%`);
      conditions.push(`v.vehicle_type ILIKE $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT b.*, u.name, u.email, v.vehicle_type, v.passenger_capacity
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       ${where}
       ORDER BY b.created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const getBookingById = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    const result = await pool.query(
      `SELECT b.*, u.name, u.email, v.vehicle_type, v.passenger_capacity
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = result.rows[0];

    if (req.user.role === "requester" && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(booking);
  } catch (err) {
    next(err);
  }
};

const getBookingFlow = async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    const bookingRes = await pool.query(
      `SELECT b.*, u.name AS requester_name, u.email AS requester_email, u.phone AS requester_phone,
              v.vehicle_type, v.passenger_capacity
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId]
    );

    if (bookingRes.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const booking = bookingRes.rows[0];
    if (req.user.role === "requester" && booking.user_id !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const auditRes = await pool.query(
      `SELECT a.id, a.action, a.old_status, a.new_status, a.remarks, a.ip_address, a.performed_by,
              a.created_at, u.name AS performed_by_name, u.email AS performed_by_email
       FROM audit_logs a
       LEFT JOIN users u ON a.performed_by = u.id
       WHERE a.booking_id = $1
       ORDER BY a.id ASC`,
      [bookingId]
    );

    res.json({
      booking,
      requester: {
        name: booking.requester_name,
        email: booking.requester_email,
        phone: booking.requester_phone
      },
      audit: auditRes.rows
    });
  } catch (err) {
    next(err);
  }
};

const reportIssue = async (req, res, next) => {
  try {
    const actorRole = req.user?.role === "approver" ? "oic" : req.user?.role;
    if (actorRole !== "supervisor") {
      return res.status(403).json({ message: "Only Transport Supervisor can report vehicle issues from this panel" });
    }

    const bookingId = req.params.id;
    const { reason, mark_unavailable } = req.body || {};
    if (!reason || !String(reason).trim()) {
      return res.status(400).json({ message: "Reason is required" });
    }

    const bookingResult = await pool.query(
      `SELECT b.*, u.name, u.email, v.vehicle_type
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.id = $1`,
      [bookingId]
    );
    if (bookingResult.rowCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }
    const booking = bookingResult.rows[0];
    if (!["Approved", "Assigned"].includes(booking.status)) {
      return res.status(400).json({
        message: "Report issue is only for Approved or Assigned bookings"
      });
    }

    const requesterName = booking.name;
    const requesterEmail = booking.email;
    const vehicleId = booking.vehicle_id;
    const vehicleType = booking.vehicle_type;
    const startTime = booking.start_time;
    const endTime = booking.end_time;
    const bookingDate = new Date(startTime).toISOString().slice(0, 10);

    // Mark booking cancelled (so it disappears from approver pending list)
    await pool.query(
      `UPDATE bookings
       SET status = 'Cancelled',
           rejection_reason = $2
       WHERE id = $1`,
      [bookingId, `Cancelled due to vehicle issue: ${String(reason).trim()}`]
    );

    await emailService.sendEmail({
      to: requesterEmail,
      subject: "Booking cancelled – vehicle issue",
      text: `Dear ${requesterName},\n\nYour booking has been cancelled because the assigned vehicle has an issue and cannot be used.\n\nReason: ${reason}\n\nBooking date: ${bookingDate}\nStart: ${startTime}\nEnd: ${endTime}\n\nPlease submit a new booking request (or contact the transport office if urgent).\n\nRegards,\nIITM Fleet`
    }).catch((e) => console.error("Report-issue email failed:", e.message));

    if (mark_unavailable) {
      await pool.query(
        `UPDATE vehicles SET status = 'Unavailable' WHERE id = $1`,
        [vehicleId]
      );
    }

    return res.json({
      message: "Issue reported. Booking cancelled and requester notified by email.",
      cancelled: true,
      vehicle_marked_unavailable: Boolean(mark_unavailable)
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  bookVehicle,
  viewPending,
  viewGuidePending,
  guideApprove,
  guideReject,
  viewUpcoming,
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
};

