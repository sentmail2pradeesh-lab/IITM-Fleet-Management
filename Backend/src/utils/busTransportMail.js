/**
 * Standard Bus Transport Cell notification layout (plain + HTML Arial).
 * Contact block is included where appropriate per institute templates.
 */

const CONTACT_EMAIL = "bustransport@iitm.ac.in";
const CONTACT_PHONES_TEXT = "044-22574970 / 044-22575971";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function contactBlockText() {
  return `For any assistance or cancellation of the trip please reach the transport cell through email or phone:

Email: ${CONTACT_EMAIL}
Phone: ${CONTACT_PHONES_TEXT}

(Note: Cancellation of trips before 4 hours of pickup time must be informed by telephone.)`;
}

function signatureText() {
  return `Regards
Bus Transport Cell.

Email: ${CONTACT_EMAIL}
Phone: ${CONTACT_PHONES_TEXT}`;
}

function signatureHtml() {
  return `<p style="margin:16px 0 0 0;">Regards,<br/>Bus Transport Cell.</p>
<p style="margin:8px 0 0 0;font-size:13px;">Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br/>
Phone: ${escHtml(CONTACT_PHONES_TEXT)}</p>`;
}

function contactBlockHtml() {
  return `<p style="margin:12px 0 0 0;">For any assistance or cancellation of the trip please reach the transport cell through email or phone:</p>
<p style="margin:6px 0 0 0;">Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br/>
Phone: ${escHtml(CONTACT_PHONES_TEXT)}</p>
<p style="margin:10px 0 0 0;font-size:13px;"><b>Important note:</b> Cancellation of trips before 4 hours of pickup time must be informed by telephone.</p>`;
}

function wrapHtml(inner) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111;line-height:1.45;">${inner}</div>`;
}

/**
 * @param {{ subjectLine: string, salutationName: string, bodyParagraphs: string[], detailsBlock?: string, includeContactBlock?: boolean, includeSignature?: boolean }} opts
 */
function buildBusMail(opts) {
  const {
    subjectLine,
    salutationName,
    bodyParagraphs,
    detailsBlock,
    includeContactBlock = false,
    includeSignature = true
  } = opts;

  const lines = [];
  lines.push(`Dear ${salutationName}:`);
  lines.push("");
  for (const p of bodyParagraphs) {
    lines.push(p);
    lines.push("");
  }
  if (detailsBlock) {
    lines.push(detailsBlock.trim());
    lines.push("");
  }
  if (includeContactBlock) {
    lines.push(contactBlockText());
    lines.push("");
  }
  if (includeSignature) {
    lines.push(signatureText());
  }

  const text = lines.join("\n").trim();

  const parasHtml = bodyParagraphs
    .map((p) => `<p style="margin:0 0 10px 0;">${escHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
  const detailsHtml = detailsBlock
    ? `<div style="margin:12px 0;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;white-space:pre-wrap;">${escHtml(
        detailsBlock
      )}</div>`
    : "";
  const contactHtml = includeContactBlock ? contactBlockHtml() : "";
  const sigHtml = includeSignature ? signatureHtml() : "";

  const html = wrapHtml(
    `<p style="margin:0 0 10px 0;"><b>${escHtml(subjectLine)}</b></p>
<p style="margin:0 0 10px 0;">Dear ${escHtml(salutationName)}:</p>
${parasHtml}
${detailsHtml}
${contactHtml}
${sigHtml}`
  );

  return { subject: subjectLine, text, html };
}

function tripDetailsBlock(bookingLike) {
  const lines = [];
  if (bookingLike.id != null) lines.push(`Booking ID: ${bookingLike.id}`);
  if (bookingLike.name) lines.push(`Name: ${bookingLike.name}`);
  if (bookingLike.start_time) lines.push(`Start: ${bookingLike.start_time}`);
  if (bookingLike.end_time) lines.push(`End: ${bookingLike.end_time}`);
  if (bookingLike.pickup_location) lines.push(`Pickup: ${bookingLike.pickup_location}`);
  if (bookingLike.drop_location) lines.push(`Drop: ${bookingLike.drop_location}`);
  if (bookingLike.passenger_count != null) lines.push(`Passenger count: ${bookingLike.passenger_count}`);
  if (bookingLike.purpose) lines.push(`Purpose: ${bookingLike.purpose}`);
  return lines.join("\n");
}

module.exports = {
  CONTACT_EMAIL,
  CONTACT_PHONES_TEXT,
  buildBusMail,
  tripDetailsBlock,
  escHtml,
  wrapHtml,
  signatureText,
  contactBlockText
};
