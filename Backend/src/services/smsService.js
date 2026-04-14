const twilio = require("twilio");

function normalizeToE164(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return "";

  // If already in E.164, keep as-is.
  if (raw.startsWith("+")) return raw;

  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return "";

  // If user stored 10-digit Indian numbers, convert using a default country code.
  const countryCode = String(process.env.TWILIO_DEFAULT_COUNTRY_CODE || "91").replace(
    /[^\d]/g,
    ""
  );

  if (digits.length === 10) return `+${countryCode}${digits}`;
  if (digits.length > 10) return `+${digits}`;

  // Too short to safely normalize; let Twilio validate and fail.
  return `+${countryCode}${digits}`;
}

function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)");
  }
  return twilio(sid, token);
}

async function sendSMS(phone, message) {
  try {
    const to = normalizeToE164(phone);
    if (!to) throw new Error("Missing recipient phone");

    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const from = process.env.TWILIO_FROM_NUMBER;

    if (!messagingServiceSid && !from) {
      throw new Error(
        "Twilio sender missing (set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER)"
      );
    }

    const client = getTwilioClient();
    const resp = await client.messages.create({
      to,
      body: String(message ?? ""),
      ...(messagingServiceSid ? { messagingServiceSid } : { from })
    });

    console.log("SMS sent:", {
      sid: resp.sid,
      to: resp.to,
      from: resp.from || resp.messagingServiceSid,
      status: resp.status
    });
    return {
      provider: "twilio",
      sid: resp.sid,
      to: resp.to,
      from: resp.from,
      messagingServiceSid: resp.messagingServiceSid,
      status: resp.status
    };
  } catch (error) {
    console.error("SMS failed:", error.message);
    throw error;
  }
}

module.exports = { sendSMS, normalizeToE164 };