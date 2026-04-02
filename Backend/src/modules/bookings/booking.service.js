const pool = require('../../config/db');
const availabilityService = require('../../services/availabilityService');
const { isVehicleAvailable } = require('../../services/availabilityService');

const createBooking = async (data, userId, filePath) => {

  const {
    vehicle_id,
    start_time,
    end_time,
    purpose,
    pickup_location,
    drop_location,
    return_required,
    return_pickup_time,
    campus_type,
    passenger_count,
    hod_email
  } = data;

  if (new Date(start_time) >= new Date(end_time)) {
    throw new Error('Invalid time range');
  }

  // Ensure vehicle exists and capacity is sufficient
  const vehicleResult = await pool.query(
    `SELECT passenger_capacity FROM vehicles WHERE id = $1`,
    [vehicle_id]
  );

  if (vehicleResult.rowCount === 0) {
    throw new Error('Selected vehicle does not exist');
  }

  const capacity = vehicleResult.rows[0].passenger_capacity;
  if (passenger_count > capacity) {
    throw new Error(
      `Passenger count (${passenger_count}) exceeds vehicle capacity (${capacity})`
    );
  }

  const isAvailable = await availabilityService.isVehicleAvailable(
    vehicle_id,
    start_time,
    end_time
  );

  if (!isAvailable) {
    throw new Error('Vehicle not available for selected time');
  }

  const result = await pool.query(
    `INSERT INTO bookings (
      user_id,
      vehicle_id,
      start_time,
      end_time,
      purpose,
      pickup_location,
      drop_location,
      return_required,
      return_pickup_time,
      campus_type,
      passenger_count,
      hod_email,
      document_url,
      status
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Pending Guide Approval'
    )
    RETURNING *`,
    [
      userId,
      vehicle_id,
      start_time,
      end_time,
      purpose,
      pickup_location,
      drop_location,
      return_required,
      return_pickup_time,
      campus_type,
      passenger_count,
      hod_email,
      filePath
    ]
  );

  return result.rows[0];
};

const getPendingBookings = async () => {
  const result = await pool.query(
    `SELECT b.*, u.name, u.email, v.vehicle_type
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.status IN (
       'Guide Approved',
       'Approved',
       'Cancellation Requested'
     )
     ORDER BY b.created_at DESC`
  );

  return result.rows;
};

const getUpcomingBookings = async () => {
  const result = await pool.query(
    `SELECT b.*, u.name, u.email, v.vehicle_type
     FROM bookings b
     JOIN users u ON b.user_id = u.id
     LEFT JOIN vehicles v ON b.vehicle_id = v.id
     WHERE b.status IN (
       'Assigned',
       'Delayed',
       'In Progress'
     )
     ORDER BY b.start_time ASC`
  );

  return result.rows;
};

const approveBooking = async (bookingId) => {
  const result = await pool.query(
    `UPDATE bookings
     SET status = 'Approved'
     WHERE id = $1 AND status = 'Guide Approved'
     RETURNING *`,
    [bookingId]
  );
  const booking = result.rows[0];
  if (booking?.vehicle_id) {
    await pool.query(
      `UPDATE vehicles SET status = 'Booked' WHERE id = $1`,
      [booking.vehicle_id]
    );
  }
  return booking;
};

const rejectBooking = async (bookingId, reason) => {
  const getBooking = await pool.query(
    `SELECT vehicle_id, status FROM bookings WHERE id = $1`,
    [bookingId]
  );
  const row = getBooking.rows[0];
  if (!row) return null;
  const statusUpdate = row.status === 'Cancellation Requested' ? 'Cancelled' : 'Rejected';
  const result = await pool.query(
    `UPDATE bookings
     SET status = $2,
         rejection_reason = $3
     WHERE id = $1 AND status IN ('Pending', 'Cancellation Requested')
     RETURNING *`,
    [bookingId, statusUpdate, reason]
  );
  const booking = result.rows[0];
  if (booking?.vehicle_id) {
    await pool.query(
      `UPDATE vehicles SET status = 'Available' WHERE id = $1`,
      [booking.vehicle_id]
    );
  }
  return booking;
};

module.exports = {
  createBooking,
  getPendingBookings,
  getUpcomingBookings,
  approveBooking,
  rejectBooking
};
