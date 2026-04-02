const cron = require("node-cron");
const delayService = require("../services/delayDetectionService");

console.log("Delay monitor scheduler started...");


cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("Running delay check...");
    await delayService.checkDelayedTrips();
  } catch (error) {
    console.error("Delay detection failed:", error.message);
  }
});