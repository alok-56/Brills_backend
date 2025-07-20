const globalErrHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || "error";
  const message = err.message || "Internal Server Error";
  const stack = err.stack;

  return res.status(statusCode).json({
    status: status === "error" ? false : true,
    code: statusCode,
    message,
    stack: stack,
  });
};

module.exports = globalErrHandler;
