const pool = require("../config/db");

async function ensureSchema() {
  // Keep this idempotent; it should be safe on every boot.
  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS hod_name TEXT;
  `);
}

module.exports = { ensureSchema };

