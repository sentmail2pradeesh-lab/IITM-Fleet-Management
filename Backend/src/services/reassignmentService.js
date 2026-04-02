const db = require("../config/db");

exports.findAlternativeVehicles = async (booking) => {

const result = await db.query(
    `
    SELECT v.*
    FROM vehicles v
    WHERE v.id NOT IN (
    SELECT vehicle_id
    FROM bookings
    WHERE status IN ('Approved','Assigned','In Progress')
    AND (
        start_time < $2 AND end_time > $1
    )
    )
    AND v.passenger_capacity >= $3
    ORDER BY v.passenger_capacity ASC
    LIMIT 3
    `,
    [
    booking.start_time,
    booking.end_time,
    booking.passenger_count
    ]
    );

  return result.rows;
};