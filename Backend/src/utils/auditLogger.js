const pool = require("../config/db");

exports.logAction = async ({
  bookingId,
  performedBy,
  action,
  oldStatus,
  newStatus,
  ip,
  remarks
}) => {
  try {
    // Backward compatible: add column if DB was created earlier.
    await pool.query(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS remarks TEXT`);
    await pool.query(
      `INSERT INTO audit_logs
       (booking_id, performed_by, action, old_status, new_status, ip_address, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        bookingId,
        performedBy,
        action,
        oldStatus,
        newStatus,
        ip,
        remarks != null && String(remarks).trim() ? String(remarks).trim() : null
      ]
    );
  } catch (error) {
    console.error("Audit logging failed:", error.message);
  }
};