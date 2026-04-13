const pool = require("../config/db");
const { sendSMS } = require("./smsService");

const SMS_TYPES = {
  BOOKING_CONFIRMED: "BOOKING_CONFIRMED",
  TRIP_REMINDER_4H: "TRIP_REMINDER_4H"
};

async function ensureSmsLogTable() {
  // Lightweight persistence so reminders are sent exactly once per booking.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_notification_logs (
      id SERIAL PRIMARY KEY,
      booking_id INTEGER NOT NULL,
      sms_type TEXT NOT NULL,
      recipient_phone TEXT,
      provider_response JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (booking_id, sms_type)
    )
  `);
}

function formatTripDateTime(value) {
  try {
    // Keep message readable; provider will deliver raw text.
    return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  } catch {
    return String(value ?? "");
  }
}

function normalizePhone10(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  // System currently validates 10 digits for drivers; keep consistent.
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function buildTripMessage({ title, booking, requester, driver }) {
  const requesterName = requester?.name || "-";
  const requesterPhone = requester?.phone ? normalizePhone10(requester.phone) : "-";
  const requesterEmail = requester?.email || "-";

  return [
    title,
    "",
    `Driver: ${driver?.name || booking?.driver_name || "-"}`,
    `Trip Date & Time: ${formatTripDateTime(booking?.start_time)}`,
    `Pickup: ${booking?.pickup_location || "-"}`,
    `Drop: ${booking?.drop_location || "-"}`,
    "",
    `Requester: ${requesterName}`,
    `Requester Contact: ${requesterPhone}${requesterEmail ? ` (${requesterEmail})` : ""}`
  ].join("\n");
}

async function logOnce({ bookingId, smsType, recipientPhone, providerResponse }) {
  await ensureSmsLogTable();
  try {
    await pool.query(
      `INSERT INTO sms_notification_logs (booking_id, sms_type, recipient_phone, provider_response)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (booking_id, sms_type) DO NOTHING`,
      [bookingId, smsType, recipientPhone || null, providerResponse || null]
    );
  } catch (e) {
    // Even if logging fails, do not break the booking flow.
    console.error("SMS log insert failed:", e.message);
  }
}

async function alreadySent(bookingId, smsType) {
  await ensureSmsLogTable();
  const res = await pool.query(
    `SELECT 1 FROM sms_notification_logs WHERE booking_id = $1 AND sms_type = $2 LIMIT 1`,
    [bookingId, smsType]
  );
  return res.rowCount > 0;
}

async function sendDriverBookingConfirmedSMS({ booking, requester, driver }) {
  const bookingId = booking?.id;
  if (!bookingId) throw new Error("Missing booking id");

  const to = normalizePhone10(driver?.phone || booking?.driver_phone);
  if (!to) throw new Error("Missing driver phone");

  if (await alreadySent(bookingId, SMS_TYPES.BOOKING_CONFIRMED)) return;

  const message = buildTripMessage({
    title: "Vehicle booking confirmed (OIC approved)",
    booking,
    requester,
    driver
  });

  const resp = await sendSMS(to, message);
  await logOnce({
    bookingId,
    smsType: SMS_TYPES.BOOKING_CONFIRMED,
    recipientPhone: to,
    providerResponse: resp
  });
}

async function sendDriverTripReminder4hSMS({ booking, requester }) {
  const bookingId = booking?.id;
  if (!bookingId) throw new Error("Missing booking id");

  const to = normalizePhone10(booking?.driver_phone);
  if (!to) throw new Error("Missing driver phone");

  if (await alreadySent(bookingId, SMS_TYPES.TRIP_REMINDER_4H)) return;

  const message = buildTripMessage({
    title: "Reminder: Trip starts in the next 4 hours",
    booking,
    requester,
    driver: { name: booking?.driver_name, phone: booking?.driver_phone }
  });

  const resp = await sendSMS(to, message);
  await logOnce({
    bookingId,
    smsType: SMS_TYPES.TRIP_REMINDER_4H,
    recipientPhone: to,
    providerResponse: resp
  });
}

module.exports = {
  SMS_TYPES,
  ensureSmsLogTable,
  alreadySent,
  sendDriverBookingConfirmedSMS,
  sendDriverTripReminder4hSMS
};

