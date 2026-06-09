const { db } = require('../../config/database');
const { hashPassword } = require('../../utils/password');

/**
 * Get all users with optional filtering and pagination.
 */
async function listUsers({ page = 1, limit = 20, role, search, isActive }) {
  const skip = (page - 1) * limit;

  const where = {};
  if (role) where.role = role;
  if (typeof isActive === 'boolean') where.isActive = isActive;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { username: { contains: search, mode: 'insensitive' } },
    ];
  }

  const { data: users, total } = db.users.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      avatar: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single user by ID.
 */
async function getUserById(id) {
  const user = db.users.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      avatar: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  }

  return user;
}

/**
 * Update a user by ID.
 */
async function updateUser(id, data) {
  // If password is being updated, hash it
  if (data.password) {
    data.password = await hashPassword(data.password);
  }

  const user = db.users.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      avatar: true,
      isActive: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Soft-delete a user by deactivating their account.
 */
async function deleteUser(id) {
  db.users.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Create a new user (admin use case).
 */
async function createUser(data) {
  const hashedPassword = await hashPassword(data.password);

  const user = db.users.create({
    data: {
      ...data,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}

module.exports = { listUsers, getUserById, updateUser, deleteUser, createUser };
