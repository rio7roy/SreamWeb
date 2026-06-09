const { z } = require('zod');

const ROLES = ['ADMIN', 'EXPERT', 'STREAM_LAB', 'ILAB_SCHOOL', 'CREATIVE_CORNER'];

const loginSchema = z.object({
  identifier: z
    .string()
    .min(2, 'Username or email must be at least 2 characters')
    .max(255),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128),
});

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100),
    email: z
      .string()
      .email('Invalid email address'),
    username: z
      .string()
      .min(2, 'Username must be at least 2 characters')
      .max(50)
      .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    role: z.enum(ROLES).default('EXPERT'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Reset token is required'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

module.exports = {
  ROLES,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
