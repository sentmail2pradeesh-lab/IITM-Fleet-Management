const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail } = require('./auth.service');
const sendEmail = require("../../config/email").sendEmail;
const pool = require("../../config/db");
const {
  requestPasswordReset,
  resetPassword: resetPasswordService,
} = require("../../services/passwordResetService");

const registerExternal = async (req,res,next)=>{

  try{

    const { name,email,password,phone } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Keep only the latest OTP per email
    await pool.query(
      `DELETE FROM email_otps WHERE email = $1`,
      [normalizedEmail]
    );

    await pool.query(
      `INSERT INTO email_otps (email,otp,expires_at)
       VALUES ($1,$2,NOW()+INTERVAL '10 minutes')`,
      [normalizedEmail,otp]
    );

    await sendEmail({
      to: normalizedEmail,
      subject:"Verify Email",
      text:`Your OTP is ${otp}`
    });

    res.json({message:"OTP sent", email: normalizedEmail});

  }catch(err){
    next(err);
  }

};


const registerIIT = async (req, res, next) => {
  try {
    const { name, phone, roll_number, password } = req.body;

    const email = `${roll_number}@smail.iitm.ac.in`.trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Keep only the latest OTP per email
    await pool.query(
      `DELETE FROM email_otps WHERE email = $1`,
      [email]
    );

    await pool.query(
      `INSERT INTO email_otps (email, otp, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '10 minutes')`,
      [email, otp]
    );

    await sendEmail({
      to: email,
      subject: "IITM Vehicle Booking OTP",
      text: `Your OTP is ${otp}`
    });

    res.json({
      message: "OTP sent to IIT email",
      email
    });

  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ message: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }
    await requestPasswordReset(email);
    res.json({
      message:
        "If that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password required" });
    }
    await resetPasswordService(token, password);
    res.json({ message: "Password reset successful" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// OTP-based password reset:
// - Send OTP to email (without revealing whether email exists)
// - Verify OTP and update password
const forgotPasswordOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Do not reveal whether email exists.
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.json({
        message:
          "If that email exists, an OTP has been sent for password reset.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Keep only the latest OTP per email
    await pool.query(`DELETE FROM email_otps WHERE email = $1`, [
      normalizedEmail
    ]);

    await pool.query(
      `INSERT INTO email_otps (email,otp,expires_at)
       VALUES ($1,$2,NOW()+INTERVAL '10 minutes')`,
      [normalizedEmail, otp]
    );

    await sendEmail({
      to: normalizedEmail,
      subject: "Password Reset OTP",
      text: `Your password reset OTP is ${otp}`,
    });

    return res.json({
      message:
        "If that email exists, an OTP has been sent for password reset.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPasswordOtp = async (req, res, next) => {
  try {
    const { email, otp: rawOtp, newPassword } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });
    if (!rawOtp) return res.status(400).json({ message: "OTP required" });
    if (!newPassword) {
      return res.status(400).json({ message: "Password required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const otp = String(rawOtp).trim();

    const result = await pool.query(
      `SELECT * FROM email_otps
       WHERE email = $1
         AND TRIM(CAST(otp AS TEXT)) = $2
         AND expires_at > NOW()`,
      [normalizedEmail, otp]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password = $1
       WHERE email = $2`,
      [hashedPassword, normalizedEmail]
    );

    // OTP is single-use
    await pool.query(`DELETE FROM email_otps WHERE email = $1`, [
      normalizedEmail
    ]);

    res.json({ message: "Password reset successful" });
  } catch (error) {
    next(error);
  }
};

const verifyOTP = async (req,res,next)=>{

  try{

    const { email: rawEmail, otp: rawOtp, name, password, phone, roll_number, user_type } = req.body;
    const email = (rawEmail || "").trim().toLowerCase();
    const otp = rawOtp != null ? String(rawOtp).trim() : "";
    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    const result = await pool.query(
      `SELECT * FROM email_otps
       WHERE email = $1 AND TRIM(CAST(otp AS TEXT)) = $2 AND expires_at > NOW()`,
      [email, otp]
    );

    if(result.rowCount === 0){
      return res.status(400).json({message:"Invalid or expired OTP"});
    }

    // If user already exists, ask them to login instead of failing as "OTP failed"
    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (existing.rowCount > 0) {
      await pool.query(`DELETE FROM email_otps WHERE email = $1`, [email]);
      return res.status(409).json({ message: "User already exists. Please login." });
    }

    const hashedPassword = await bcrypt.hash(password,10);
    const rollNum = roll_number === "" || roll_number == null ? null : roll_number;

    // Ensure JWT `role` matches backend allowRole checks.
    let mappedRole = "requester";
    if (user_type === "approver") {
      mappedRole = "oic";
    } else if (user_type === "supervisor") {
      mappedRole = "supervisor";
    } else if (user_type === "guide_hod") {
      mappedRole = "guide_hod";
    }

    let user;
    try {
      user = await pool.query(
        `INSERT INTO users
        (name,email,password,phone,roll_number,user_type,role)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id,name,email`,
        [name,email,hashedPassword,phone,rollNum,user_type,mappedRole]
      );
    } catch (e) {
      if (e && e.code === "23505") {
        // Unique violation
        await pool.query(`DELETE FROM email_otps WHERE email = $1`, [email]);
        return res.status(409).json({ message: "User already exists. Please login." });
      }
      throw e;
    }

    // OTP is single-use
    await pool.query(`DELETE FROM email_otps WHERE email = $1`, [email]);

    res.json(user.rows[0]);

  }catch(err){
    next(err);
  }

};

// Returns the authoritative role/profile for the logged-in user
const me = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(403).json({ message: "No user" });

    const result = await pool.query(
      `SELECT id, name, email, role FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    const role = user.role === "approver" ? "oic" : user.role;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  registerIIT,
  registerExternal,
  verifyOTP,
  login,
  forgotPassword,
  resetPassword,
  forgotPasswordOtp,
  resetPasswordOtp,
  me
};