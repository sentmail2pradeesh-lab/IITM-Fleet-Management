const {
  createVehicle,
  createVehiclesBulk,
  getAllVehicles,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle
} = require('./vehicle.service');

const scheduleService = require("../../services/scheduleService");
const pool = require("../../config/db");   // needed for DB query


const addVehicle = async (req, res) => {
  try {

    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

    const {
      registration_number,
      vehicle_type,
      passenger_capacity,
      condition_status
    } = req.body;

    const image1 = req.files?.image1?.[0]?.path || null;
    const image2 = req.files?.image2?.[0]?.path || null;
    const image3 = req.files?.image3?.[0]?.path || null;

    const vehicle = await createVehicle({
      registration_number,
      vehicle_type,
      passenger_capacity,
      condition_status,
      image1,
      image2,
      image3
    });

    res.status(201).json(vehicle);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addVehiclesBulk = async (req, res) => {
  try {
    const {
      vehicle_type,
      passenger_capacity,
      count,
      registration_number,
      registration_prefix,
      registration_numbers,
      condition_status
    } = req.body;

    const cnt = Math.max(1, Math.min(100, parseInt(count, 10) || 1));
    const isBusType = String(vehicle_type || "").startsWith("BUS-");
    let parsedRegNumbers = [];
    if (registration_numbers) {
      if (Array.isArray(registration_numbers)) {
        parsedRegNumbers = registration_numbers;
      } else if (typeof registration_numbers === "string") {
        try {
          parsedRegNumbers = JSON.parse(registration_numbers);
        } catch {
          parsedRegNumbers = registration_numbers
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
        }
      }
    }

    if (isBusType) {
      if (parsedRegNumbers.length !== cnt || parsedRegNumbers.some((r) => !String(r || "").trim())) {
        return res.status(400).json({
          message: "For BUS types, enter all registration numbers (one per vehicle)."
        });
      }
    }

    const image1 = req.files?.image1?.[0]?.path || null;
    const image2 = req.files?.image2?.[0]?.path || null;
    const image3 = req.files?.image3?.[0]?.path || null;

    const vehicles = await createVehiclesBulk({
      vehicle_type,
      passenger_capacity,
      count: cnt,
      registration_number,
      registration_prefix: registration_prefix || (isBusType ? vehicle_type : vehicle_type),
      registration_numbers: parsedRegNumbers,
      condition_status,
      image1,
      image2,
      image3
    });

    res.status(201).json(vehicles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listVehicles = async (req, res, next) => {
  try {
    const vehicles = await getAllVehicles();
    res.json(vehicles);
  } catch (err) {
    next(err);
  }
};

const updateVehicleById = async (req, res, next) => {
  try {
    const id = req.params.id;
    const {
      registration_number,
      vehicle_type,
      passenger_capacity,
      condition_status
    } = req.body;
    const image1 = req.files?.image1?.[0]?.path;
    const image2 = req.files?.image2?.[0]?.path;
    const image3 = req.files?.image3?.[0]?.path;
    const vehicle = await updateVehicle(id, {
      registration_number,
      vehicle_type,
      passenger_capacity,
      condition_status,
      image1,
      image2,
      image3
    });
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
};

const changeVehicleStatus = async (req, res, next) => {
  try {
    const vehicle = await updateVehicleStatus(
      req.params.id,
      req.body.status
    );
    res.json(vehicle);
  } catch (err) {
    next(err);
  }
};

const removeVehicle = async (req, res, next) => {
  try {
    const vehicle = await deleteVehicle(req.params.id);

    res.json({
      message: "Vehicle deleted successfully",
      vehicle
    });

  } catch (err) {
    next(err);
  }
};


const getVehicleSchedule = async (req,res,next) => {

  try{

    const { id } = req.params;
    const { date } = req.query;

    const schedule =
      await scheduleService.getVehicleSchedule(id,date);

    res.json({
      vehicle_id:id,
      date,
      schedule
    });

  }catch(err){
    next(err);
  }

};

const getVehicleAvailabilitySummary = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        message: "Date is required"
      });
    }

    const booked = await pool.query(
      `SELECT DISTINCT v.id, v.vehicle_type
       FROM vehicles v
       JOIN bookings b ON b.vehicle_id = v.id
       WHERE DATE(b.start_time) = $1`,
      [date]
    );

    const available = await pool.query(
      `SELECT v.id, v.vehicle_type
       FROM vehicles v
       WHERE v.id NOT IN (
         SELECT vehicle_id
         FROM bookings
         WHERE DATE(start_time) = $1
       )`,
      [date]
    );

    const byType = new Map();
    for (const row of available.rows) {
      const key = row.vehicle_type || "Unknown";
      const curr =
        byType.get(key) || { vehicle_type: key, available_count: 0, booked_count: 0 };
      curr.available_count += 1;
      byType.set(key, curr);
    }
    for (const row of booked.rows) {
      const key = row.vehicle_type || "Unknown";
      const curr =
        byType.get(key) || { vehicle_type: key, available_count: 0, booked_count: 0 };
      curr.booked_count += 1;
      byType.set(key, curr);
    }

    res.json(
      Array.from(byType.values()).sort((a, b) =>
        String(a.vehicle_type).localeCompare(String(b.vehicle_type))
      )
    );
  } catch (err) {
    next(err);
  }
};

const getVehicleAvailabilityByType = async (req, res, next) => {
  try {
    const { date, type } = req.query;
    if (!date || !type) {
      return res.status(400).json({
        message: "date and type are required"
      });
    }

    const availableRes = await pool.query(
      `SELECT *
       FROM vehicles
       WHERE vehicle_type = $2
         AND id NOT IN (
           SELECT vehicle_id
           FROM bookings
           WHERE DATE(start_time) = $1
         )
       ORDER BY id ASC`,
      [date, type]
    );

    const bookedRes = await pool.query(
      `SELECT DISTINCT v.*
       FROM vehicles v
       JOIN bookings b ON b.vehicle_id = v.id
       WHERE v.vehicle_type = $2
         AND DATE(b.start_time) = $1
       ORDER BY v.id ASC`,
      [date, type]
    );

    res.json({
      vehicle_type: type,
      available: availableRes.rows,
      booked: bookedRes.rows
    });
  } catch (err) {
    next(err);
  }
};


// NEW CONTROLLER (for Home page vehicle search)
const getAvailableVehicles = async (req, res, next) => {
  try {

    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Date is required"
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM vehicles
      WHERE id NOT IN (
        SELECT vehicle_id
        FROM bookings
        WHERE DATE(start_time) = $1
      )
      `,
      [date]
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
};

const getVehicleTypeDetails = async (req, res, next) => {
  try {
    const { type } = req.params;

    const result = await pool.query(
      `SELECT vehicle_type, passenger_capacity
       FROM vehicles
       WHERE vehicle_type = $1
       LIMIT 1`,
      [type]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Vehicle type not found"
      });
    }

    const count = await pool.query(
      `SELECT COUNT(*)
       FROM vehicles
       WHERE vehicle_type = $1
       AND status = 'Available'`,
      [type]
    );

    res.json({
      vehicle_type: result.rows[0].vehicle_type,
      passenger_capacity: result.rows[0].passenger_capacity,
      available_count: count.rows[0].count
    });

  } catch (err) {
    next(err);
  }
};

const getVehicleBookedDates = async (req, res, next) => {
  try {
    const vehicleId = Number(req.params.id);
    if (!Number.isFinite(vehicleId)) {
      return res.status(400).json({ message: "Invalid vehicle id" });
    }

    // Optional range. Defaults: last 30 days to next 60 days.
    const now = new Date();
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(now.getTime() - 30 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date(now.getTime() + 60 * 86400000);

    const result = await pool.query(
      `SELECT id, status, start_time, end_time, pickup_location, drop_location
       FROM bookings
       WHERE vehicle_id = $1
         AND start_time >= $2
         AND start_time <= $3
         AND status IN ('Pending OIC Approval', 'Assigned', 'Delayed', 'In Progress', 'Completed', 'Approved')
       ORDER BY start_time ASC`,
      [vehicleId, from.toISOString(), to.toISOString()]
    );

    res.json({
      vehicle_id: vehicleId,
      from: from.toISOString(),
      to: to.toISOString(),
      bookings: result.rows
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addVehicle,
  addVehiclesBulk,
  listVehicles,
  updateVehicleById,
  changeVehicleStatus,
  removeVehicle,
  getVehicleSchedule,
  getVehicleAvailabilitySummary,
  getVehicleAvailabilityByType,
  getAvailableVehicles,
  getVehicleTypeDetails,
  getVehicleBookedDates
};