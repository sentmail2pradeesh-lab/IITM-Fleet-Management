const bcrypt = require("bcryptjs");
const pool = require("../../config/db");

function normalizeRole(role) {
  return role === "approver" ? "oic" : role;
}

function isIitEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  return value.endsWith("@iitm.ac.in") || value.endsWith("@smail.iitm.ac.in");
}

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
      `SELECT id, name, email, phone, role, user_type
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

    const { name, email, password, phone, role } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedRole = String(role || "").trim().toLowerCase();

    if (!name || !normalizedEmail || !password || !normalizedRole) {
      return res.status(400).json({ message: "name, email, password and role are required" });
    }

    if (!["supervisor", "driver"].includes(normalizedRole)) {
      return res.status(400).json({ message: "role must be supervisor or driver" });
    }

    if (normalizedRole === "supervisor" && !isIitEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Supervisor must use IIT registered email" });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const userType = normalizedRole;
    const result = await pool.query(
      `INSERT INTO users (name, email, password, phone, role, user_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role, user_type`,
      [String(name).trim(), normalizedEmail, hashed, phone || null, normalizedRole, userType]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "User with this email already exists" });
    }
    next(err);
  }
};

module.exports = {
  listUsers,
  createUser
};
