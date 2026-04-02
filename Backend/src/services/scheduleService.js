const db = require("../config/db");

exports.getVehicleSchedule = async (vehicleId, date) => {

  const result = await db.query(
    `SELECT start_time, end_time
     FROM bookings
     WHERE vehicle_id = $1
     AND DATE(start_time) = $2
     AND status IN ('Approved','Assigned','In Progress')
     ORDER BY start_time`,
    [vehicleId, date]
  );

  const bookings = result.rows;

  const dayStart = new Date(`${date}T08:00:00`);
  const dayEnd = new Date(`${date}T20:00:00`);

  let schedule = [];
  let current = new Date(dayStart);

  for (let b of bookings) {

    const bookingStart = new Date(b.start_time);
    const bookingEnd = new Date(b.end_time);

    if (current < bookingStart) {
      schedule.push({
        start: current,
        end: bookingStart,
        status: "Free"
      });
    }

    schedule.push({
      start: bookingStart,
      end: bookingEnd,
      status: "Booked"
    });

    current = bookingEnd;
  }

  if (current < dayEnd) {
    schedule.push({
      start: current,
      end: dayEnd,
      status: "Free"
    });
  }

  return schedule;
};