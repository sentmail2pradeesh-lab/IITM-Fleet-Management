const reportService = require("./report.service");
const { Parser } = require("json2csv");

function getDateRangeForPeriod(period) {
  const now = new Date();
  let start, end;
  if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31);
  } else {
    return null;
  }
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

exports.getReport = async (req, res, next) => {
  try {
    const { start_date, end_date, period, vehicle_type, download } = req.query;

    let rangeStart = start_date;
    let rangeEnd = end_date;
    if ((!rangeStart || !rangeEnd) && period) {
      const range = getDateRangeForPeriod(period);
      if (range) {
        rangeStart = range.start_date;
        rangeEnd = range.end_date;
      }
    }
    if (!rangeStart || !rangeEnd) {
      return res.status(400).json({ error: "Start and end date required, or use period=month|year" });
    }

    const data = await reportService.getUsageByDateRange(
      rangeStart,
      rangeEnd,
      vehicle_type || null
    );

    if (download === "true") {
      const fields = ["vehicle_id", "vehicle_type", "vehicle_name", "total_trips", "total_hours"];
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      res.header("Content-Type", "text/csv");
      res.attachment("vehicle-usage-report.csv");
      return res.send(csv);
    }

    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getVehicleTypes = async (req, res, next) => {
  try {
    const types = await reportService.getVehicleTypes();
    res.json(types);
  } catch (err) {
    next(err);
  }
};