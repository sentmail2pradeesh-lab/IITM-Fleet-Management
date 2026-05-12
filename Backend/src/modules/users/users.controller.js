const bcrypt = require("bcryptjs");
const pool = require("../../config/db");
const emailService = require("../../config/email");

function getPublicFrontendBaseUrl() {
  return (
    process.env.FRONTEND_PUBLIC_URL ||
    process.env.PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
}

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
    const phoneDigits = phone != null ? String(phone).trim().replace(/\D/g, "") : "";
    if (phoneDigits && phoneDigits.length !== 10) {
      return res.status(400).json({ message: "Phone must be exactly 10 digits or left empty" });
    }

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
    if (normalizedRole === "supervisor" && finalPassword.length < 8) {
      return res.status(400).json({ message: "Temporary password must be at least 8 characters" });
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
        phoneDigits && phoneDigits.length === 10 ? phoneDigits : null,
        normalizedRole,
        userType,
        normalizedRole === "driver" ? normalizedDriverId : null,
        normalizedRole === "driver" ? normalizedDesignation : null
      ]
    );

    const created = result.rows[0];

    if (normalizedRole === "supervisor" && finalEmail) {
      const loginUrl = `${getPublicFrontendBaseUrl()}/login`;
      try {
        await emailService.sendEmail({
          to: finalEmail,
          subject: "IITM Fleet — Supervisor account created",
          text: `Dear ${String(name).trim()},

An Officer In-charge has created a Transport Supervisor account for you on the IIT Madras Fleet Booking Portal.

Login URL: ${loginUrl}
Email (login): ${finalEmail}
Temporary password: ${finalPassword}

Please sign in and change your password after first login (Forgot password / profile options as applicable).

Regards,
IITM Fleet Transport`
        });
      } catch (emailErr) {
        console.error("Supervisor welcome email failed:", emailErr.message);
      }
    }

    res.status(201).json(created);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "User with this email already exists" });
    }
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const actorRole = normalizeRole(req.user?.role);
    if (actorRole !== "oic") {
      return res.status(403).json({ message: "Only OIC can update users here" });
    }

    const userId = Number(req.params.id);
    if (!Number.isFinite(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const body = req.body || {};
    const name = String(body.name || "").trim();
    const nextRole = String(body.role || "").trim().toLowerCase();
    const passwordRaw = String(body.password || "").trim();
    const phoneDigits =
      body.phone != null && String(body.phone).trim() !== ""
        ? String(body.phone).replace(/\D/g, "")
        : "";
    if (phoneDigits && phoneDigits.length !== 10) {
      return res.status(400).json({ message: "Phone must be exactly 10 digits or left empty" });
    }
    const nextPhone = phoneDigits.length === 10 ? phoneDigits : null;

    if (name.length < 2 || name.length > 200) {
      return res.status(400).json({ message: "Name must be between 2 and 200 characters" });
    }
    if (!["supervisor", "driver"].includes(nextRole)) {
      return res.status(400).json({ message: "role must be supervisor or driver" });
    }
    if (passwordRaw && passwordRaw.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters, or leave blank" });
    }

    const targetRes = await pool.query(
      `SELECT id, role, email FROM users WHERE id = $1`,
      [userId]
    );
    if (targetRes.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const target = targetRes.rows[0];
    if (!["driver", "supervisor"].includes(target.role)) {
      return res.status(400).json({
        message: "Only drivers and supervisors can be updated from this screen."
      });
    }

    let nextEmail = null;
    let nextDriverId = null;
    let nextDesignation = null;

    if (nextRole === "supervisor") {
      nextEmail = String(body.email || "").trim().toLowerCase();
      if (!nextEmail) {
        return res.status(400).json({ message: "Email is required for supervisor" });
      }
      if (!isIitEmail(nextEmail)) {
        return res.status(400).json({ message: "Supervisor must use IIT registered email" });
      }
      const dup = await pool.query(
        `SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) AND id <> $2 LIMIT 1`,
        [nextEmail, userId]
      );
      if (dup.rowCount > 0) {
        return res.status(409).json({ message: "Another user already has this email" });
      }
      if (target.role === "driver" && !passwordRaw) {
        return res.status(400).json({
          message: "When changing a driver to supervisor, set a new password (min 8 characters)."
        });
      }
    } else {
      nextDriverId = String(body.driver_id_no || "").trim();
      nextDesignation = String(body.designation || "").trim().toUpperCase();
      if (!nextDriverId) {
        return res.status(400).json({ message: "Driver ID No is required" });
      }
      if (!nextDesignation) {
        return res.status(400).json({ message: "Designation is required for driver" });
      }
      if (!DRIVER_DESIGNATIONS.includes(nextDesignation)) {
        return res.status(400).json({
          message: "Invalid designation for driver"
        });
      }
      const dupD = await pool.query(
        `SELECT id FROM users WHERE role = 'driver' AND driver_id_no = $1 AND id <> $2 LIMIT 1`,
        [nextDriverId, userId]
      );
      if (dupD.rowCount > 0) {
        return res.status(409).json({ message: "Another driver already has this ID No" });
      }
    }

    let nextPasswordHash = null;
    if (passwordRaw) {
      nextPasswordHash = await bcrypt.hash(passwordRaw, 10);
    } else if (target.role === "supervisor" && nextRole === "driver") {
      nextPasswordHash = await bcrypt.hash(`Drv@${Math.random().toString(36).slice(-10)}`, 10);
    }

    const baseParams = [
      name,
      nextRole === "supervisor" ? nextEmail : null,
      nextPhone,
      nextRole,
      nextRole,
      nextRole === "driver" ? nextDriverId : null,
      nextRole === "driver" ? nextDesignation : null
    ];

    let updated;
    if (nextPasswordHash) {
      updated = await pool.query(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone = $3,
             role = $4,
             user_type = $5,
             driver_id_no = $6,
             designation = $7,
             password = $8
         WHERE id = $9
         RETURNING id, name, email, phone, role, user_type, driver_id_no, designation`,
        [...baseParams, nextPasswordHash, userId]
      );
    } else {
      updated = await pool.query(
        `UPDATE users
         SET name = $1,
             email = $2,
             phone = $3,
             role = $4,
             user_type = $5,
             driver_id_no = $6,
             designation = $7
         WHERE id = $8
         RETURNING id, name, email, phone, role, user_type, driver_id_no, designation`,
        [...baseParams, userId]
      );
    }

    const row = updated.rows[0];

    if (target.role === "driver" && nextRole === "supervisor" && passwordRaw && nextEmail) {
      const loginUrl = `${getPublicFrontendBaseUrl()}/login`;
      try {
        await emailService.sendEmail({
          to: nextEmail,
          subject: "IITM Fleet — Supervisor account (role updated)",
          text: `Dear ${name},

Your account has been updated to Transport Supervisor on the IIT Madras Fleet Booking Portal.

Login URL: ${loginUrl}
Email (login): ${nextEmail}
Password: ${passwordRaw}

Please sign in and change your password after first login if required.

Regards,
IITM Fleet Transport`
        });
      } catch (emailErr) {
        console.error("Supervisor role-change email failed:", emailErr.message);
      }
    }

    return res.json(row);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "Email or driver ID conflicts with an existing user" });
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
  updateUser,
  deleteUser
};
