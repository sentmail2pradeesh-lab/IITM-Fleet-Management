const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require("express-rate-limit");
const cron = require("./jobs/delayMonitor");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");
const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://fleetbookingportal.netlify.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman / backend calls

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true
  })
);


app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  })
);



app.use(express.json({
  limit: "1mb"
}));

app.use(express.urlencoded({ extended: true }));

app.use(morgan("combined"));

app.get('/health', (req, res) => {
  res.json({ status: 'Fleet System Running' });
});

app.use("/uploads", express.static("uploads"));

const pool = require('./config/db');

app.get('/db-test', async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  res.json(result.rows);
});

const authRoutes = require('./modules/auth/auth.routes');
app.use('/api/auth', authRoutes);

const vehicleRoutes = require('./modules/vehicles/vehicle.routes');
app.use('/api/vehicles', vehicleRoutes);

const bookingRoutes = require('./modules/bookings/booking.routes');
app.use('/api/bookings', bookingRoutes);

const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes");
app.use("/api/whatsapp", whatsappRoutes);

const reportRoutes = require("./modules/reports/report.routes");
app.use("/api/reports", reportRoutes);

const userRoutes = require("./modules/users/users.routes");
app.use("/api/users", userRoutes);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: "Too many requests. Please try again later."
  }
});
app.use("/api", (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  return apiLimiter(req, res, next);
});

app.get("/test-email", async (req, res) => {
  try {
    const emailService = require("./config/email");

    await emailService.sendEmail({
      to: "sentmail2pradeesh@gmail.com",
      subject: "Test Email",
      text: "Email system working"
    });

    res.send("Email sent successfully");
  } catch (error) {
    console.error("Email failed:", error);
    res.status(500).send("Email failed");
  }
});

const errorHandler = require("./middleware/errorHandler");
app.use(errorHandler);

app.disable("x-powered-by");

module.exports = app;
