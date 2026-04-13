const cron = require("node-cron");
const pool = require("../config/db");
const smsNotificationService = require("../services/smsNotificationService");

console.log("Trip reminder scheduler started...");

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// Runs every minute. Sends reminder once for trips starting in ~4 hours.
cron.schedule("* * * * *", async () => {
  try {
    await smsNotificationService.ensureSmsLogTable();

    const now = new Date();
    const from = addMinutes(now, 240); // 4 hours
    const to = addMinutes(now, 241); // 4 hours + 1 minute window

    // Only consider trips that have been confirmed (Assigned).
    const res = await pool.query(
      `SELECT b.*, u.name AS requester_name, u.email AS requester_email, u.phone AS requester_phone
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.status = 'Assigned'
         AND b.start_time >= $1
         AND b.start_time < $2
         AND b.driver_phone IS NOT NULL
         AND LENGTH(TRIM(COALESCE(b.driver_phone, ''))) > 0
       ORDER BY b.start_time ASC`,
      [from.toISOString(), to.toISOString()]
    );

    for (const booking of res.rows) {
      try {
        await smsNotificationService.sendDriverTripReminder4hSMS({
          booking,
          requester: {
            name: booking.requester_name,
            email: booking.requester_email,
            phone: booking.requester_phone
          }
        });
      } catch (e) {
        console.error(`4h reminder failed for booking ${booking.id}:`, e.message);
      }
    }
  } catch (error) {
    console.error("Trip reminder scheduler failed:", error.message);
  }
});

