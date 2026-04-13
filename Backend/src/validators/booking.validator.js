const Joi = require("joi");

exports.createBookingSchema = Joi.object({
  vehicle_id: Joi.number()
    .integer()
    .required()
    .messages({
      "any.required": "Vehicle ID is required",
      "number.base": "Vehicle ID must be a number"
    }),

  start_time: Joi.date()
    .iso()
    .required()
    .messages({
      "date.base": "Start time must be a valid date"
    }),

  end_time: Joi.date()
    .iso()
    .greater(Joi.ref("start_time"))
    .required()
    .messages({
      "date.greater": "End time must be after start time"
    }),

  pickup_location: Joi.string()
    .min(3)
    .max(200)
    .required(),

  drop_location: Joi.string()
    .min(3)
    .max(200)
    .required(),

  purpose: Joi.string()
    .min(3)
    .max(500)
    .required(),

  campus_type: Joi.string()
    .valid("inside", "outside")
    .required(),

  return_required: Joi.boolean()
    .required(),

  return_pickup_time: Joi.date()
    .iso()
    .optional()
    .allow(null, ""),

  passenger_count: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .required()
});

exports.assignDriverSchema = Joi.object({
  driver_name: Joi.string()
    .min(3)
    .max(100)
    .required(),

  driver_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Driver phone must be 10 digits"
    })
});

exports.supervisorAllotSchema = Joi.object({
  vehicle_id: Joi.number().integer().optional(),
  driver_name: Joi.string().min(3).max(100).required(),
  driver_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      "string.pattern.base": "Driver phone must be 10 digits"
    })
});

exports.cancellationSchema = Joi.object({
  reason: Joi.string()
    .min(5)
    .max(500)
    .required()
});