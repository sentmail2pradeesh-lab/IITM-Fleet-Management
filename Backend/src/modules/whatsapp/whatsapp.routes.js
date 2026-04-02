const express = require("express");
const router = express.Router();
const whatsappService = require("./whatsapp.service");

// GET: used by Meta to verify your webhook
router.get("/webhook", (req, res) => {
  const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();

  const mode = req.query["hub.mode"] || req.query["hub_mode"];
  const token = (req.query["hub.verify_token"] || req.query["hub_verify_token"] || "").trim();
  const challenge = req.query["hub.challenge"] || req.query["hub_challenge"];

  console.log("WA WEBHOOK VERIFY - mode:", mode);
  console.log("WA WEBHOOK VERIFY - token from Meta:", token);
  console.log("WA WEBHOOK VERIFY - token from env :", verifyToken);

  if (token === verifyToken) {
    console.log("WA WEBHOOK VERIFIED");
    return res.status(200).send(challenge);
  }

  console.log("WA WEBHOOK VERIFICATION FAILED");
  return res.sendStatus(403);
});

// POST: receives real messages
router.post("/webhook", async (req, res) => {
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const messages = changes?.value?.messages;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const msg of messages) {
      if (msg.type !== "text") continue;
      const from = msg.from;             // driver’s WhatsApp number (E.164)
      const body = msg.text?.body || ""; // message text
      await whatsappService.processDriverMessage(from, body);
    }

    return res.sendStatus(200);
  } catch (e) {
    console.error("WhatsApp webhook error:", e);
    return res.sendStatus(500);
  }
});

module.exports = router;