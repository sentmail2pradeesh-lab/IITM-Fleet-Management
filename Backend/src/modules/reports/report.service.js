const pool = require("../../config/db");

exports.getUsageByDateRange = async (startDate, endDate, vehicleType = null) => {
  const params = [startDate, endDate];
  let vehicleClause = "";
  if (vehicleType) {
    params.push(vehicleType);
    vehicleClause = ` AND v.vehicle_type = $${params.length}`;
  }
  const result = await pool.query(
    `
    SELECT
      v.id AS vehicle_id,
      v.vehicle_type,
      v.registration_number AS vehicle_name,
      COUNT(b.id) AS total_trips,
      COALESCE(
        SUM(
          EXTRACT(
            EPOCH FROM (
              COALESCE(b.actual_end_time, b.end_time) - COALESCE(b.actual_start_time, b.start_time)
            )
          ) / 3600
        ),
        0
      ) AS total_hours
    FROM public.bookings b
    JOIN public.vehicles v ON b.vehicle_id = v.id
    WHERE b.status IN ('Assigned', 'In Progress', 'Completed')
      AND b.start_time BETWEEN $1 AND $2
      ${vehicleClause}
    GROUP BY v.id, v.vehicle_type, v.registration_number
    ORDER BY total_trips DESC
    `,
    params
  );
  return result.rows;
};

exports.getDriverUsageByDateRange = async (startDate, endDate) => {
  const result = await pool.query(
    `
    SELECT
      COALESCE(NULLIF(TRIM(b.driver_name), ''), 'Unassigned') AS driver_name,
      COALESCE(NULLIF(TRIM(b.driver_phone), ''), '-') AS driver_phone,
      COUNT(b.id) AS total_trips,
      COALESCE(
        SUM(
          EXTRACT(
            EPOCH FROM (
              COALESCE(b.actual_end_time, b.end_time) - COALESCE(b.actual_start_time, b.start_time)
            )
          ) / 3600
        ),
        0
      ) AS total_hours
    FROM public.bookings b
    WHERE b.status IN ('Assigned', 'In Progress', 'Completed')
      AND b.start_time BETWEEN $1 AND $2
    GROUP BY
      COALESCE(NULLIF(TRIM(b.driver_name), ''), 'Unassigned'),
      COALESCE(NULLIF(TRIM(b.driver_phone), ''), '-')
    ORDER BY total_trips DESC
    `,
    [startDate, endDate]
  );
  return result.rows;
};

exports.getVehicleTypes = async () => {
  const result = await pool.query(
    `SELECT DISTINCT vehicle_type FROM vehicles ORDER BY vehicle_type`
  );
  return result.rows.map((r) => r.vehicle_type);
};