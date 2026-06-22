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

// In-memory arrays — seeded on startup
let users = [];
let stocks = [];
let stockHistory = [];

/**
 * Seed initial demo users.
 * Called once on server startup.
 */
async function seedDatabase() {
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const demoPassword = await bcrypt.hash('Demo@123', 12);
  const rioPassword = await bcrypt.hash('123rio', 12);

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
  const initialStocks = loadJSON('stocks.json');

  users.push(...activeExperts, ...activeAdmins);
  const allBrcs = loadJSON('brcs.json');

  if (initialStocks && initialStocks.length > 0) {
    // If no brcs.json, just push the defaults
    if (!allBrcs || allBrcs.length === 0) {
      stocks.push(...initialStocks.map(s => ({
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...s
      })));
    } else {
      // Seed the items for every single BRC so they show up everywhere
      allBrcs.forEach(b => {
        const seededStocks = initialStocks.map(s => ({
          id: generateId(),
          createdAt: new Date('2026-06-01T00:00:00Z'),
          updatedAt: new Date('2026-06-01T00:00:00Z'),
          ...s,
          brc: b.code,
          district: b.district
        }));
        stocks.push(...seededStocks);

        // Seed history for June 1st
        seededStocks.forEach(s => {
          stockHistory.push({
             stockId: s.id,
             availableQty: s.availableQty !== undefined ? s.availableQty : (s.newQty ?? s.quantity),
             updatedAt: s.updatedAt,
             brc: s.brc,
             district: s.district
          });
        });
      });
    }
  }

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
      if (where) {
        const found = users.find((u) => {
          return Object.entries(where).every(([key, val]) => {
            if (typeof u[key] === 'string' && typeof val === 'string') {
              return u[key].toLowerCase() === val.toLowerCase();
            }
            return u[key] === val;
          });
        });
        if (found) return { ...found };
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
  stocks: {
    findMany: ({ where = {}, skip = 0, take, orderBy, select } = {}) => {
      let result = [...stocks];

      if (where.district) result = result.filter(s => !s.district || s.district === where.district);
      if (where.brc) result = result.filter(s => !s.brc || s.brc === where.brc);
      if (where.status) {
        if (where.status === 'AVAILABLE' || where.status === 'ACTIVE') {
          result = result.filter(s => (s.availableQty ?? s.newQty ?? s.quantity ?? 0) > 0);
        } else if (where.status === 'CONSUMED') {
          result = result.filter(s => (s.consumedQty || 0) > 0);
        } else if (where.status === 'USED') {
          result = result.filter(s => (s.usedQty || 0) > 0);
        } else if (where.status === 'DAMAGED') {
          result = result.filter(s => (s.damagedQty || 0) > 0);
        } else {
          result = result.filter(s => s.status === where.status);
        }
      }
      if (where.category) result = result.filter(s => s.category === where.category);
      if (where.source) result = result.filter(s => s.source === where.source);
      if (where.itemName) {
        const queryName = where.itemName.toLowerCase();
        result = result.filter(s => s.itemName && s.itemName.toLowerCase() === queryName);
      }
      if (where.search) {
        const search = where.search.toLowerCase();
        result = result.filter(s => 
          (s.itemName && s.itemName.toLowerCase().includes(search)) || 
          (s.serialNumber && s.serialNumber.toLowerCase().includes(search)) ||
          (s.spaceCode && s.spaceCode.toLowerCase().includes(search)) ||
          (s.uniqueId && s.uniqueId.toLowerCase().includes(search))
        );
      }

      if (orderBy) {
        const [field, dir] = Object.entries(orderBy)[0];
        result.sort((a, b) => {
          if (dir === 'desc') return b[field] > a[field] ? 1 : -1;
          return a[field] > b[field] ? 1 : -1;
        });
      }

      const total = result.length;
      if (skip) result = result.slice(skip);
      if (take) result = result.slice(0, take);

      if (select) {
        result = result.map((s) => {
          const selected = {};
          Object.keys(select).forEach((key) => { if (select[key]) selected[key] = s[key]; });
          return selected;
        });
      }

      return { data: result, total };
    },

    create: ({ data } = {}) => {
      const newStock = {
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      stocks.push(newStock);
      return { ...newStock };
    },

    createMany: ({ data } = {}) => {
      const newStocks = data.map(item => ({
        id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...item
      }));
      stocks.push(...newStocks);
      return { count: newStocks.length };
    },

    update: ({ where, data } = {}) => {
      const index = stocks.findIndex(s => s.id === where.id);
      if (index === -1) {
        const err = new Error('Record not found');
        err.code = 'P2025';
        throw err;
      }
      stocks[index] = { ...stocks[index], ...data, updatedAt: new Date() };
      
      const updatedStock = stocks[index];
      stockHistory.push({
         stockId: updatedStock.id,
         availableQty: updatedStock.availableQty !== undefined ? updatedStock.availableQty : (updatedStock.newQty ?? updatedStock.quantity),
         updatedAt: updatedStock.updatedAt,
         brc: updatedStock.brc,
         district: updatedStock.district
      });

      return { ...updatedStock };
    },
    
    updateMany: ({ data } = {}) => {
      // In a real DB this would be an updateMany query. 
      // For mock DB, we'll assume we iterate and update all.
      let count = 0;
      stocks = stocks.map(stock => {
        count++;
        return { ...stock, ...data, updatedAt: new Date() };
      });
      return { count };
    },

    delete: ({ where } = {}) => {
      const index = stocks.findIndex(s => s.id === where.id);
      if (index === -1) {
        const err = new Error('Record not found');
        err.code = 'P2025';
        throw err;
      }
      stocks.splice(index, 1);
      return true;
    }
  },

  stockHistory: {
    findMany: ({ where = {} } = {}) => {
      let filtered = [...stockHistory];
      if (where.brc) filtered = filtered.filter(item => item.brc === where.brc);
      if (where.district) filtered = filtered.filter(item => item.district === where.district);
      if (where.stockId) filtered = filtered.filter(item => item.stockId === where.stockId);
      return { data: filtered };
    }
  }
};

module.exports = { db, seedDatabase };
