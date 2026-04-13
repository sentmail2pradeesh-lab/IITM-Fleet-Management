const axios = require("axios");

const sendSMS = async (phone, message) => {
  try {
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message: message,
        numbers: phone,
      },
      {
        headers: {
          authorization: process.env.SMS_API_KEY,
        },
      }
    );

    console.log("SMS sent:", response.data);
    return response.data;
  } catch (error) {
    console.error("SMS failed:", error.message);
    throw error;
  }
};

module.exports = { sendSMS };