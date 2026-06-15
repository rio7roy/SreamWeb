const { db } = require('../../config/database');

/**
 * Get stocks with pagination and filters
 */
async function listStocks({ page = 1, limit = 20, district, brc, status, category, search }) {
  const skip = (page - 1) * limit;

  const where = {};
  if (district) where.district = district;
  if (brc) where.brc = brc;
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) where.search = search;

  const { data: stocks, total } = db.stocks.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' },
  });

  return {
    stocks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get all stocks without pagination (for reports/downloads)
 */
async function getAllStocks(filters = {}) {
  const { data } = db.stocks.findMany({
    where: filters,
    orderBy: { createdAt: 'desc' },
  });
  return data;
}

/**
 * Create a single stock item
 */
async function createStock(data) {
  const stock = db.stocks.create({ data });
  return stock;
}

/**
 * Get single stock by id
 */
async function getStockById(id) {
  const stock = db.stocks.findMany({ where: { id }, take: 1 });
  if (stock.data && stock.data.length > 0) return stock.data[0];
  return null;
}

/**
 * Update stock by id
 */
async function updateStockById(id, data) {
  const result = db.stocks.update({
    where: { id },
    data
  });
  return result;
}

/**
 * Delete stock by id
 */
async function deleteStockById(id) {
  const result = db.stocks.delete({
    where: { id }
  });
  return result;
}

/**
 * Bulk create stock items
 */
async function bulkCreateStocks(items) {
  // Add some default values if missing
  const data = items.map(item => ({
    status: 'ACTIVE',
    ...item
  }));
  const result = db.stocks.createMany({ data });
  return result;
}

/**
 * Bulk update all stocks
 */
async function bulkUpdateStocks(data) {
  const result = db.stocks.updateMany({ data });
  return result;
}

module.exports = {
  listStocks,
  getAllStocks,
  createStock,
  getStockById,
  updateStockById,
  deleteStockById,
  bulkCreateStocks,
  bulkUpdateStocks,
};
