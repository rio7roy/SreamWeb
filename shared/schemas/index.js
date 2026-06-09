const authSchemas = require('./auth.schema');
const userSchemas = require('./user.schema');

module.exports = {
  ...authSchemas,
  ...userSchemas,
};
