module.exports = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });

    if (error) {
      const message = error.details.map((d) => d.message).join("; ");
      return res.status(400).json({
        error: message,
        message
      });
    }

    req.body = value;
    next();
  };
};