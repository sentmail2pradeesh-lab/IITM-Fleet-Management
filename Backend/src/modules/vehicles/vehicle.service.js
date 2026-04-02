const pool = require('../../config/db');

const createVehicle = async ({
  registration_number,
  vehicle_type,
  passenger_capacity,
  condition_status,
  image1,
  image2,
  image3
}) => {

  const result = await pool.query(
    `INSERT INTO vehicles
     (registration_number, vehicle_type, passenger_capacity, status, condition_status, image1, image2, image3)
     VALUES ($1,$2,$3,'Available',$4,$5,$6,$7)
     RETURNING *`,
    [
      registration_number,
      vehicle_type,
      passenger_capacity,
      condition_status,
      image1,
      image2,
      image3
    ]
  );

  return result.rows[0];
};

const createVehiclesBulk = async ({
  vehicle_type,
  passenger_capacity,
  count,
  registration_number,
  registration_prefix,
  registration_numbers,
  condition_status,
  image1,
  image2,
  image3
}) => {
  const created = [];
  const regList = Array.isArray(registration_numbers) ? registration_numbers : [];
  for (let i = 1; i <= count; i++) {
    const regNum = regList[i - 1] || (
      count === 1
        ? (registration_number || vehicle_type)
        : `${registration_prefix || vehicle_type}-${i}`
    );
    const v = await createVehicle({
      registration_number: regNum,
      vehicle_type,
      passenger_capacity,
      condition_status: condition_status || 'Working',
      image1,
      image2,
      image3
    });
    created.push(v);
  }
  return created;
};

const getAllVehicles = async () => {
  const result = await pool.query(
    `SELECT * FROM vehicles ORDER BY id ASC`
  );

  return result.rows;
};

const updateVehicleStatus = async (id, status) => {

  const result = await pool.query(
    `UPDATE vehicles
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return result.rows[0];
};

const updateVehicle = async (id, {
  registration_number,
  vehicle_type,
  passenger_capacity,
  condition_status,
  image1,
  image2,
  image3
}) => {
  const current = await pool.query(
    'SELECT * FROM vehicles WHERE id = $1',
    [id]
  );
  if (current.rowCount === 0) throw new Error('Vehicle not found');

  const row = current.rows[0];
  const reg = registration_number !== undefined ? registration_number : row.registration_number;
  const type = vehicle_type !== undefined ? vehicle_type : row.vehicle_type;
  const cap = passenger_capacity !== undefined ? passenger_capacity : row.passenger_capacity;
  const cond = condition_status !== undefined ? condition_status : row.condition_status;
  const img1 = image1 !== undefined ? image1 : row.image1;
  const img2 = image2 !== undefined ? image2 : row.image2;
  const img3 = image3 !== undefined ? image3 : row.image3;

  const result = await pool.query(
    `UPDATE vehicles
     SET registration_number = $1, vehicle_type = $2, passenger_capacity = $3,
         condition_status = $4, image1 = $5, image2 = $6, image3 = $7
     WHERE id = $8
     RETURNING *`,
    [reg, type, cap, cond, img1, img2, img3, id]
  );
  return result.rows[0];
};

const deleteVehicle = async (id) => {

  // check active bookings
  const bookingCheck = await pool.query(
    `SELECT id FROM bookings
     WHERE vehicle_id = $1
     AND status IN ('Approved','Assigned','In Progress')`,
    [id]
  );

  if (bookingCheck.rowCount > 0) {
    throw new Error("Vehicle cannot be deleted. Active bookings exist.");
  }

  const result = await pool.query(
    `DELETE FROM vehicles
     WHERE id = $1
     RETURNING *`,
    [id]
  );

  return result.rows[0];
};

module.exports = {
  createVehicle,
  createVehiclesBulk,
  getAllVehicles,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle
};
