require('dotenv').config();
const app = require('./app');
const cron = require('node-cron');
const { checkDelayedTrips } = require('./services/delayDetectionService');const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


cron.schedule('* * * * *', async () => {
  console.log("Running delay check...");
  await checkDelayedTrips();   // ✅ CORRECT
});