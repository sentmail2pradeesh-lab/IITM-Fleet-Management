const db = require("../config/db");
const emailService = require("../config/email");
const reassignmentService = require("./reassignmentService");

exports.checkDelayedTrips = async () => {

  const grace = parseInt(process.env.GRACE_MINUTES);

  const result = await db.query(
    `SELECT * FROM bookings
     WHERE status = 'In Progress'
     AND actual_end_time IS NULL
     AND NOW() > end_time + INTERVAL '${grace} minutes'`
  );

  for (let booking of result.rows) {

    // mark delayed
    await db.query(
      `UPDATE bookings
       SET status = 'Delayed'
       WHERE id = $1`,
      [booking.id]
    );

    // notify approver
    await emailService.sendEmail({
      to: process.env.APPROVER_EMAIL,
      subject: "Booking Automatically Marked Delayed",
      text: `Booking ID ${booking.id} exceeded end time.`
    });

    // 🔍 find next booking for same vehicle
    const nextBookingResult = await db.query(
      `SELECT * FROM bookings
       WHERE vehicle_id = $1
       AND start_time > $2
       AND status IN ('Approved','Assigned')
       ORDER BY start_time ASC
       LIMIT 1`,
      [booking.vehicle_id, booking.end_time]
    );

    if (nextBookingResult.rowCount === 0) continue;

    const nextBooking = nextBookingResult.rows[0];

    const userResult = await db.query(
      `SELECT name,email FROM users WHERE id = $1`,
      [nextBooking.user_id]
    );

    const user = userResult.rows[0];

    // notify next user
    await emailService.sendEmail({
      to: user.email,
      subject: "Vehicle Delay Notification",
      text: `
Dear ${user.name},

Your scheduled vehicle may be delayed due to the previous trip running late.

Booking ID: ${nextBooking.id}
Vehicle ID: ${nextBooking.vehicle_id}
Start Time: ${nextBooking.start_time}

The transport office will update you shortly.

Regards
IITM Transport System
      `
    });

    // 🚗 NEW PART: find alternative vehicles
    const alternatives = await reassignmentService.findAlternativeVehicles(nextBooking);

    if (alternatives.length > 0) {

      const vehicleList = alternatives
        .map(v => `Vehicle ${v.id} (Capacity: ${v.passenger_capacity})`)
        .join("\n");

      await emailService.sendEmail({
        to: process.env.APPROVER_EMAIL,
        subject: "Alternative Vehicles Available",
        text: `
Booking ${nextBooking.id} may require reassignment.

Original Vehicle: ${nextBooking.vehicle_id}

Available Alternatives:

${vehicleList}

Please reassign vehicle from dashboard.
        `
      });

    }

  }

};