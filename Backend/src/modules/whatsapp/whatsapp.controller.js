const whatsappService = require("./whatsapp.service");

exports.verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

exports.handleWebhook = async (req, res, next) => {
  try {
    const body = req.body;

    if (body.object) {
      const message =
        body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

      if (message) {
        const from = message.from;
        const text = message.text?.body;

        if (text) {
          await whatsappService.processDriverMessage(from, text);
        }
      }

      return res.sendStatus(200);
    }

    res.sendStatus(404);
  } catch (err) {
    next(err);
  }
};