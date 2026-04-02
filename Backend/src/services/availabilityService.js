const db = require("../config/db");

exports.isVehicleAvailable = async (vehicleId, startTime, endTime) => {
  const bufferMinutes = parseInt(process.env.BUFFER_MINUTES || "30");

  const result = await db.query(
    `
    SELECT 1 FROM bookings
    WHERE vehicle_id = $1
    AND status IN ('Approved','Assigned','In Progress')
    AND (
        start_time < $3::timestamp + ($4 || ' minutes')::interval
        AND
        end_time > $2::timestamp - ($4 || ' minutes')::interval
    )
    `,
    [vehicleId, startTime, endTime, bufferMinutes]
  );

  return result.rowCount === 0;
};