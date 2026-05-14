const pool = require("../config/db");

async function ensureSchema() {
  // Keep this idempotent; it should be safe on every boot.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS fleet_locations (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS fleet_locations_label_lower_idx
    ON fleet_locations (LOWER(TRIM(label)));
  `);

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

