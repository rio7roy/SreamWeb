const { db } = require('../../config/database');

/**
 * Get stocks with pagination and filters
 */
async function listStocks({ page = 1, limit = 20, district, brc, status, category, search, source }) {
  const skip = (page - 1) * limit;

  const where = {};
  if (district) where.district = district;
  if (brc) where.brc = brc;
  if (status) where.status = status;
  if (category) where.category = category;
  if (search) where.search = search;
  if (source) where.source = source;

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
 * Bulk create or update stock items (Upsert by itemName + brc)
 */
async function bulkUpsertStocks(items) {
  let updatedCount = 0;
  let createdCount = 0;

  for (const item of items) {
    const existing = db.stocks.findMany({
      where: {
        itemName: item.itemName,
        brc: item.brc,
      },
      take: 1
    });

    if (existing.data && existing.data.length > 0) {
      // Update existing item (add quantity)
      const ex = existing.data[0];
      
      const currentNewQty = ex.newQty !== undefined ? ex.newQty : ex.quantity;
      const currentAvailableQty = ex.availableQty !== undefined ? ex.availableQty : currentNewQty;
      
      db.stocks.update({
        where: { id: ex.id },
        data: {
          quantity: ex.quantity + item.quantity,
          newQty: currentNewQty + item.quantity,
          availableQty: currentAvailableQty + item.quantity,
          category: item.category || ex.category,
          serialNumber: item.serialNumber || ex.serialNumber,
          district: item.district || ex.district,
        }
      });
      updatedCount++;
    } else {
      // Create new
      db.stocks.create({
        data: {
          status: 'ACTIVE',
          newQty: item.quantity,
          availableQty: item.quantity,
          ...item
        }
      });
      createdCount++;
    }
  }

  return { createdCount, updatedCount };
}

/**
 * Bulk update stocks
 */
async function bulkUpdateStocks(data, where = {}) {
  const result = db.stocks.updateMany({ where, data });
  return result;
}

async function getStockHistory(filters = {}) {
  const { data } = db.stockHistory.findMany({ where: filters });
  return data;
}

module.exports = {
  listStocks,
  getAllStocks,
  getStockHistory,
  createStock,
  getStockById,
  updateStockById,
  deleteStockById,
  bulkUpsertStocks,
  bulkUpdateStocks,
};
