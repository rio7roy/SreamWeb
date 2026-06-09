/**
 * Send a standardized success response.
 * @param {import('express').Response} res
 * @param {any} data - Response payload
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Optional success message
 */
function success(res, data = null, statusCode = 200, message = 'Success') {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send a standardized error response.
 * @param {import('express').Response} res
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {any} errors - Optional error details
 */
function error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message,
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
}

module.exports = { success, error };
