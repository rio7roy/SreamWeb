require('dotenv').config();
const { z } = require('zod');
const path = require('path');

const envSchema = z.object({
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  UPLOAD_DIR: z.string().default(path.join(__dirname, '../../uploads')),
  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = { env };
