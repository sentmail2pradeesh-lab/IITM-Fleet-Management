const db = require("../../config/db");
const emailService = require("../../config/email");
const axios = require("axios");


exports.processDriverMessage = async (phone, message) => {
  const text = message.trim();
  const upperText = text.toUpperCase();

  // Find active booking for this driver
  const bookingResult = await db.query(
    `SELECT * FROM bookings
     WHERE driver_phone = $1
     AND status IN ('Assigned', 'In Progress')
     ORDER BY start_time DESC
     LIMIT 1`,
    [phone]
  );

  if (bookingResult.rows.length === 0) {
    console.log("No active booking for driver:", phone);
    return;
  }

  const booking = bookingResult.rows[0];

  // START COMMAND
  if (upperText === "START") {

    await db.query(
      `UPDATE bookings
       SET status = 'In Progress',
           actual_start_time = NOW()
       WHERE id = $1`,
      [booking.id]
    );

    console.log(`Booking ${booking.id} started`);

    return;
  }

  // END COMMAND
  if (upperText === "END") {

    await db.query(
      `UPDATE bookings
       SET status = 'Completed',
           actual_end_time = NOW()
       WHERE id = $1`,
      [booking.id]
    );

    console.log(`Booking ${booking.id} completed`);

    return;
  }

  // ISSUE COMMAND
  if (upperText.startsWith("ISSUE")) {

    const issueText = text.substring(5).trim();

    await db.query(
      `UPDATE bookings
       SET status = 'Delayed',
           issue_text = $1,
           issue_reported_at = NOW()
       WHERE id = $2`,
      [issueText, booking.id]
    );

    // Notify approver
    await emailService.sendEmail({
    to: process.env.APPROVER_EMAIL,
    subject: "Driver Reported Issue",
    text: `
  Booking ID: ${booking.id}
  Driver: ${booking.driver_name}
  Issue: ${issueText}
    `
  });

    console.log(`Issue reported for booking ${booking.id}`);

    return;
  }

  console.log("Unknown command from driver");
};

exports.sendTripDetails = async ({ driverPhone, driverName, booking }) => {

  const message = `
Trip Assigned

Date: ${booking.start_time}
Pickup: ${booking.pickup_location}
Drop: ${booking.drop_location}
User: ${booking.user_name}
User Phone: ${booking.user_phone}

Reply:
START
ISSUE <message>
END
  `;

  console.log("Send this to WhatsApp API:", message);
};


exports.sendWhatsAppMessage = async (to, message) => {
  const token =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_TOKEN ||
    "";

  const toNormalized = String(to || "").replace(/[^\d]/g, "");
  const body = String(message ?? "");

  if (!token.trim()) {
    throw new Error(
      "Missing WhatsApp access token. Set WHATSAPP_ACCESS_TOKEN (or WHATSAPP_TOKEN) in .env"
    );
  }
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("Missing WHATSAPP_PHONE_NUMBER_ID in .env");
  }
  if (!toNormalized) {
    throw new Error("Missing recipient phone number (to)");
  }
  if (!body.trim()) {
    throw new Error("Message body is empty");
  }

  try {
    const resp = await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: toNormalized,
        type: "text",
        text: { body }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("WA SEND OK:", resp.data);
    return resp.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("WA SEND FAILED:", status, data || err?.message || err);
    throw err;
  }
};