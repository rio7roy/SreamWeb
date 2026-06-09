/**
 * Zod validation middleware factory.
 * Validates request data against a Zod schema before reaching the controller.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {'body' | 'params' | 'query'} source - Which part of the request to validate
 * @returns {Function} Express middleware
 *
 * @example
 * router.post('/login', validate(loginSchema), authController.login);
 * router.get('/users/:id', validate(userParamsSchema, 'params'), usersController.getById);
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // Replace with parsed (and potentially transformed) data
      next();
    } catch (error) {
      next(error); // Pass to errorHandler which handles ZodError
    }
  };
}

module.exports = { validate };
