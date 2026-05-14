const pool = require("../../config/db");

function normalizeLabel(label) {
  return String(label || "").trim();
}

async function listActive(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, label, sort_order
       FROM fleet_locations
       WHERE active = true
       ORDER BY sort_order ASC, LOWER(label) ASC`
    );
    res.json(result.rows);
  } catch (e) {
    next(e);
  }
}

async function listManage(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, label, active, sort_order, created_at
       FROM fleet_locations
       ORDER BY active DESC, sort_order ASC, LOWER(label) ASC`
    );
    res.json(result.rows);
  } catch (e) {
    next(e);
  }
}

async function createLocation(req, res, next) {
  try {
    const label = normalizeLabel(req.body?.label);
    if (label.length < 2) {
      return res.status(400).json({ message: "Location name must be at least 2 characters." });
    }
    if (label.length > 200) {
      return res.status(400).json({ message: "Location name is too long." });
    }
    const sort_order = Number.isFinite(Number(req.body?.sort_order))
      ? Number(req.body.sort_order)
      : 0;

    const result = await pool.query(
      `INSERT INTO fleet_locations (label, sort_order, active)
       VALUES ($1, $2, true)
       RETURNING id, label, active, sort_order, created_at`,
      [label, sort_order]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ message: "A location with this name already exists." });
    }
    next(e);
  }
}

async function updateLocation(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const patches = [];
    const values = [];
    let i = 1;

    if (req.body?.label !== undefined) {
      const label = normalizeLabel(req.body.label);
      if (label.length < 2) {
        return res.status(400).json({ message: "Location name must be at least 2 characters." });
      }
      patches.push(`label = $${i++}`);
      values.push(label);
    }
    if (req.body?.active !== undefined) {
      patches.push(`active = $${i++}`);
      values.push(Boolean(req.body.active));
    }
    if (req.body?.sort_order !== undefined && Number.isFinite(Number(req.body.sort_order))) {
      patches.push(`sort_order = $${i++}`);
      values.push(Number(req.body.sort_order));
    }

    if (!patches.length) {
      return res.status(400).json({ message: "No changes provided" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE fleet_locations SET ${patches.join(", ")} WHERE id = $${i} RETURNING id, label, active, sort_order, created_at`,
      values
    );
    if (result.rowCount === 0) return res.status(404).json({ message: "Location not found" });
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({ message: "A location with this name already exists." });
    }
    next(e);
  }
}

async function deleteLocation(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

    const result = await pool.query(`DELETE FROM fleet_locations WHERE id = $1 RETURNING id`, [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: "Location not found" });
    res.json({ ok: true, id: result.rows[0].id });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listActive,
  listManage,
  createLocation,
  updateLocation,
  deleteLocation
};
