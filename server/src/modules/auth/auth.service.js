const { db } = require('../../config/database');
const { hashPassword, comparePassword } = require('../../utils/password');
const { generateToken } = require('../../utils/token');

/**
 * Authenticate a user with email/username and password.
 * @param {string} identifier - Email or username
 * @param {string} password - Plain text password
 * @returns {{ user: object, token: string }}
 */
async function login(identifier, password) {
  // Find user by email or username
  const user = db.users.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
  });

  if (!user) {
    throw Object.assign(new Error('Invalid credentials. Please check your email/username and password.'), { statusCode: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Your account has been deactivated. Contact an administrator.'), { statusCode: 403 });
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw Object.assign(new Error('Invalid credentials. Please check your email/username and password.'), { statusCode: 401 });
  }

  // Update last login timestamp
  db.users.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken({ id: user.id, role: user.role });

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

/**
 * Register a new user.
 * @param {object} data - User registration data
 * @returns {{ user: object, token: string }}
 */
async function register(data) {
  const hashedPassword = await hashPassword(data.password);

  const user = db.users.create({
    data: {
      name: data.name,
      email: data.email,
      username: data.username,
      password: hashedPassword,
      role: data.role || 'EXPERT',
    },
  });

  const token = generateToken({ id: user.id, role: user.role });

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
}

/**
 * Get user profile by ID.
 * @param {string} userId
 * @returns {object} User data without password
 */
async function getProfile(userId) {
  const user = db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      avatar: true,
      phone: true,
      address: true,
      assignedBrcs: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }

  return user;
}

async function updateProfile(userId, data) {
  const allowedFields = ['name', 'phone', 'address'];
  const updateData = {};
  
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  const updatedUser = db.users.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      avatar: true,
      phone: true,
      address: true,
      assignedBrcs: true,
      isActive: true,
    },
  });

  if (!updatedUser) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }

  // Persist to JSON if EXPERT
  if (updatedUser.role === 'EXPERT') {
    const fs = require('fs');
    const path = require('path');
    const expertsPath = path.join(__dirname, '../../../data/experts.json');
    if (fs.existsSync(expertsPath)) {
      const experts = JSON.parse(fs.readFileSync(expertsPath, 'utf8'));
      const idx = experts.findIndex(e => e.id === userId);
      if (idx !== -1) {
        Object.assign(experts[idx], updateData);
        fs.writeFileSync(expertsPath, JSON.stringify(experts, null, 2));
      }
    }
  }

  return updatedUser;
}

module.exports = { login, register, getProfile, updateProfile };
