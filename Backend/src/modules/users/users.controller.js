const bcrypt = require("bcryptjs");
const pool = require("../../config/db");

function normalizeRole(role) {
  return role === "approver" ? "oic" : role;
}

function isIitEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value.endsWith("@iitm.ac.in") || value.endsWith("@smail.iitm.ac.in");
}

const DRIVER_DESIGNATIONS = [
  "MOTORIST DRIVER GRADE 1",
  "MOTORIST DRIVER GRADE 2",
  "MOTORIST DRIVER GRADE 3",
  "MOTORIST DRIVER GRADE 4",
  "E-CART DRIVER"
];

const listUsers = async (req, res, next) => {
  try {
    const role = String(req.query?.role || "").trim();
    const values = [];
    let where = "";
    if (role) {
      values.push(role);
      where = `WHERE role = $1`;
    }
    const result = await pool.query(
      `SELECT id, name, email, phone, role, user_type, driver_id_no, designation
       FROM users
       ${where}
       ORDER BY id DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const actorRole = normalizeRole(req.user?.role);
    if (actorRole !== "oic") {
      return res.status(403).json({ message: "Only OIC can create users here" });
    }

    const { name, email, password, phone, role, driver_id_no, designation } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(role || "").trim().toLowerCase();
    const normalizedDriverId = String(driver_id_no || "").trim();
    const normalizedDesignation = String(designation || "").trim().toUpperCase();

    if (!name || !normalizedRole) {
      return res.status(400).json({ message: "name and role are required" });
    }

    if (!["supervisor", "driver"].includes(normalizedRole)) {
      return res.status(400).json({ message: "role must be supervisor or driver" });
    }

    let finalEmail = normalizedEmail;
    if (normalizedRole === "supervisor" && !finalEmail) {
      return res.status(400).json({ message: "Email is required for supervisor" });
    }
    if (normalizedRole === "supervisor" && !isIitEmail(finalEmail)) {
      return res.status(400).json({ message: "Supervisor must use IIT registered email" });
    }

    if (normalizedRole === "driver") {
      if (!normalizedDriverId) {
        return res.status(400).json({ message: "Driver ID No is required" });
      }
      if (!normalizedDesignation) {
        return res.status(400).json({ message: "Designation is required for driver" });
      }
      if (!DRIVER_DESIGNATIONS.includes(normalizedDesignation)) {
        return res.status(400).json({
          message:
            "Invalid designation. Use one of: Motorist Driver Grade 1-4 or E-CART Driver."
        });
      }

      const duplicateDriver = await pool.query(
        `SELECT id FROM users WHERE role = 'driver' AND driver_id_no = $1 LIMIT 1`,
        [normalizedDriverId]
      );
      if (duplicateDriver.rowCount > 0) {
        return res.status(409).json({ message: "Driver with this ID No already exists" });
      }

      finalEmail = null;
    }

    let finalPassword = String(password || "").trim();
    if (normalizedRole === "supervisor" && !finalPassword) {
      return res.status(400).json({ message: "Temporary password is required for supervisor" });
    }
    if (normalizedRole === "driver" && !finalPassword) {
      finalPassword = `Drv@${Math.random().toString(36).slice(-8)}`;
    }

    const hashed = await bcrypt.hash(finalPassword, 10);
    const userType = normalizedRole;
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, user_type, driver_id_no, designation)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, phone, role, user_type, driver_id_no, designation`,
      [
        String(name).trim(),
        finalEmail,
        hashed,
        phone || null,
        normalizedRole,
        userType,
        normalizedRole === "driver" ? normalizedDriverId : null,
        normalizedRole === "driver" ? normalizedDesignation : null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "User with this email already exists" });
    }
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  const client = pool;
  try {
    const actorRole = normalizeRole(req.user?.role);
    if (actorRole !== "oic" && actorRole !== "supervisor") {
      // Defensive check (routes already enforce allowRole)
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (req.user?.id && Number(req.user.id) === userId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const targetRes = await client.query(
      `SELECT id, role FROM users WHERE id = $1`,
      [userId]
    );
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const target = targetRes.rows[0];
    if (!["driver", "supervisor"].includes(target.role)) {
      return res
        .status(400)
        .json({ message: "Only drivers and supervisors can be deleted from here." });
    }

    // If audit logs are linked with FK, detach first to avoid FK constraint failures.
    // If audit_logs/performed_by isn't available or NULL isn't allowed, we still want
    // the delete attempt to proceed.
    try {
      await client.query(
        `UPDATE audit_logs
         SET performed_by = NULL
         WHERE performed_by = $1`,
        [userId]
      );
    } catch (_) {
      // best-effort only
    }

    const deleted = await client.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING id, name, email, phone, role, user_type`,
      [userId]
    );

    return res.json({ message: "User deleted successfully", user: deleted.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  createUser,
  deleteUser
};
