const pool = require("../config/db");

exports.logAction = async ({
  bookingId,
  performedBy,
  action,
  oldStatus,
  newStatus,
  ip
}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs
       (booking_id, performed_by, action, old_status, new_status, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [bookingId, performedBy, action, oldStatus, newStatus, ip]
    );
  } catch (error) {
    console.error("Audit logging failed:", error.message);
  }
};