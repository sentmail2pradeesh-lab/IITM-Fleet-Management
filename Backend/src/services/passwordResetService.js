const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { sendEmail } = require("../config/email");

const TOKEN_EXPIRY_MINUTES = 30;

async function requestPasswordReset(email) {
  const userResult = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );

  if (userResult.rows.length === 0) {
    return; // Do not reveal if email exists
  }

  const user = userResult.rows[0];

  // Generate raw token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token before saving
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const expiry = new Date(
    Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  await pool.query(
    `UPDATE users
     SET reset_password_token = $1,
         reset_password_expires = $2
     WHERE id = $3`,
    [hashedToken, expiry, user.id]
  );

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    html: `
      <h3>Password Reset</h3>
      <p>You requested a password reset.</p>
      <p>This link expires in 30 minutes.</p>
      <a href="${resetLink}">Reset Password</a>
    `,
  });
}

async function resetPassword(token, newPassword) {
  const hashedToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const userResult = await pool.query(
    `SELECT * FROM users
     WHERE reset_password_token = $1
     AND reset_password_expires > NOW()`,
    [hashedToken]
  );

  if (userResult.rows.length === 0) {
    throw new Error("Invalid or expired token");
  }

  const user = userResult.rows[0];

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await pool.query(
    `UPDATE users
     SET password = $1,
         reset_password_token = NULL,
         reset_password_expires = NULL
     WHERE id = $2`,
    [hashedPassword, user.id]
  );
}

module.exports = {
  requestPasswordReset,
  resetPassword,
};