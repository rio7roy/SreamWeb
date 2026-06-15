const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

/**
 * In-Memory Data Store
 * 
 * Replaces Prisma/PostgreSQL with a simple in-memory store.
 * All data persists only while the server is running.
 * 
 * When you're ready to connect a cloud database:
 *   1. Restore Prisma imports in service files
 *   2. Replace db.users calls with prisma.user calls
 *   3. Run prisma migrate dev
 */

const { v4: uuidv4 } = require('crypto');

// Generate UUID using built-in crypto
function generateId() {
  return require('crypto').randomUUID();
}

// In-memory users array — seeded on startup
let users = [];

/**
 * Seed initial demo users.
 * Called once on server startup.
 */
async function seedDatabase() {
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const demoPassword = await bcrypt.hash('Demo@123', 12);

  users = [
    {
      id: 'mock-admin',
      email: 'admin@stream.edu',
      username: 'admin',
      password: adminPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      isMainAdmin: true,
      avatar: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'mock-expert',
      email: 'expert@stream.edu',
      username: 'expert_demo',
      password: demoPassword,
      name: 'Dr. Sarah Chen',
      role: 'EXPERT',
      avatar: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'mock-lab',
      email: 'lab@stream.edu',
      username: 'lab_demo',
      password: demoPassword,
      name: 'STREAM Hub Manager',
      role: 'STREAM_LAB',
      avatar: null,
      assignedBrcs: ['32110100105SH'],
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'mock-ilab',
      email: 'ilab@stream.edu',
      username: 'ilab_demo',
      password: demoPassword,
      name: 'iLab School Director',
      role: 'ILAB_SCHOOL',
      avatar: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'mock-creative',
      email: 'creative@stream.edu',
      username: 'creative_demo',
      password: demoPassword,
      name: 'Creative Corner Lead',
      role: 'CREATIVE_CORNER',
      avatar: null,
      isActive: true,
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Load dynamically onboarded experts and admins from JSON
  const dataDir = path.join(__dirname, '../../data');
  const loadJSON = (filename) => {
    try {
      const filePath = path.join(dataDir, filename);
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch (err) {
      console.error(`Failed to load ${filename}`, err);
    }
    return [];
  };

  const activeExperts = loadJSON('experts.json');
  const activeAdmins = loadJSON('admins.json');

  users.push(...activeExperts, ...activeAdmins);

  console.log('✅ In-memory database seeded with demo users and persisted JSON users:');
  users.forEach((u) => console.log(`   ${u.role.padEnd(16)} → ${u.email}`));
}

// ── Query Helpers (mirror Prisma's API shape) ──

const db = {
  users: {
    findMany: ({ where = {}, skip = 0, take, orderBy, select } = {}) => {
      let result = [...users];

      // Apply filters
      if (where.role) result = result.filter((u) => u.role === where.role);
      if (where.isActive !== undefined) result = result.filter((u) => u.isActive === where.isActive);
      if (where.OR) {
        result = result.filter((u) =>
          where.OR.some((condition) => {
            return Object.entries(condition).some(([key, val]) => {
              if (val.contains) {
                const searchVal = val.mode === 'insensitive' ? val.contains.toLowerCase() : val.contains;
                const fieldVal = val.mode === 'insensitive' ? (u[key] || '').toLowerCase() : (u[key] || '');
                return fieldVal.includes(searchVal);
              }
              return u[key] === val;
            });
          })
        );
      }

      // Apply ordering
      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0];
        result.sort((a, b) => {
          if (dir === 'desc') return b[field] > a[field] ? 1 : -1;
          return a[field] > b[field] ? 1 : -1;
        });
      }

      const total = result.length;

      // Apply pagination
      if (skip) result = result.slice(skip);
      if (take) result = result.slice(0, take);

      // Apply field selection
      if (select) {
        result = result.map((u) => {
          const selected = {};
          Object.keys(select).forEach((key) => {
            if (select[key]) selected[key] = u[key];
          });
          return selected;
        });
      }

      return { data: result, total };
    },

    findUnique: ({ where, select } = {}) => {
      let user = null;
      if (where.id) user = users.find((u) => u.id === where.id);
      else if (where.email) user = users.find((u) => typeof u.email === 'string' && typeof where.email === 'string' ? u.email.toLowerCase() === where.email.toLowerCase() : u.email === where.email);
      else if (where.username) user = users.find((u) => typeof u.username === 'string' && typeof where.username === 'string' ? u.username.toLowerCase() === where.username.toLowerCase() : u.username === where.username);

      if (!user) return null;

      if (select) {
        const selected = {};
        Object.keys(select).forEach((key) => {
          if (select[key]) selected[key] = user[key];
        });
        return selected;
      }

      return { ...user };
    },

    findFirst: ({ where } = {}) => {
      if (where.OR) {
        for (const condition of where.OR) {
          const [key, val] = Object.entries(condition)[0];
          const found = users.find((u) => {
            if (typeof u[key] === 'string' && typeof val === 'string') {
              return u[key].toLowerCase() === val.toLowerCase();
            }
            return u[key] === val;
          });
          if (found) return { ...found };
        }
        return null;
      }
      return null;
    },

    create: ({ data, select } = {}) => {
      // Check uniqueness
      if (users.find((u) => u.email === data.email)) {
        const err = new Error('Unique constraint violation');
        err.code = 'P2002';
        err.meta = { target: ['email'] };
        throw err;
      }
      if (users.find((u) => u.username === data.username)) {
        const err = new Error('Unique constraint violation');
        err.code = 'P2002';
        err.meta = { target: ['username'] };
        throw err;
      }

      const newUser = {
        id: generateId(),
        avatar: null,
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      users.push(newUser);

      if (select) {
        const selected = {};
        Object.keys(select).forEach((key) => {
          if (select[key]) selected[key] = newUser[key];
        });
        return selected;
      }

      return { ...newUser };
    },

    update: ({ where, data, select } = {}) => {
      const index = users.findIndex((u) => u.id === where.id);
      if (index === -1) {
        const err = new Error('Record not found');
        err.code = 'P2025';
        throw err;
      }

      // Check uniqueness for email/username changes
      if (data.email && data.email !== users[index].email) {
        if (users.find((u) => u.email === data.email)) {
          const err = new Error('Unique constraint violation');
          err.code = 'P2002';
          err.meta = { target: ['email'] };
          throw err;
        }
      }
      if (data.username && data.username !== users[index].username) {
        if (users.find((u) => u.username === data.username)) {
          const err = new Error('Unique constraint violation');
          err.code = 'P2002';
          err.meta = { target: ['username'] };
          throw err;
        }
      }

      users[index] = { ...users[index], ...data, updatedAt: new Date() };

      if (select) {
        const selected = {};
        Object.keys(select).forEach((key) => {
          if (select[key]) selected[key] = users[index][key];
        });
        return selected;
      }

      return { ...users[index] };
    },

    count: ({ where = {} } = {}) => {
      let result = [...users];
      if (where.role) result = result.filter((u) => u.role === where.role);
      if (where.isActive !== undefined) result = result.filter((u) => u.isActive === where.isActive);
      if (where.OR) {
        result = result.filter((u) =>
          where.OR.some((condition) => {
            return Object.entries(condition).some(([key, val]) => {
              if (val.contains) {
                const searchVal = val.mode === 'insensitive' ? val.contains.toLowerCase() : val.contains;
                const fieldVal = val.mode === 'insensitive' ? (u[key] || '').toLowerCase() : (u[key] || '');
                return fieldVal.includes(searchVal);
              }
              return u[key] === val;
            });
          })
        );
      }
      return result.length;
    },
  },
};

module.exports = { db, seedDatabase };
