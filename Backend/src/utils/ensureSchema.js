const pool = require("../config/db");

async function ensureSchema() {
  // Keep this idempotent; it should be safe on every boot.
  await pool.query(`
    ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS hod_name TEXT;
  `);

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS driver_id_no TEXT,
      ADD COLUMN IF NOT EXISTS designation TEXT;
  `);

  // Drivers are managed without email now.
  await pool.query(`
    ALTER TABLE users
      ALTER COLUMN email DROP NOT NULL;
  `);
}

module.exports = { ensureSchema };

