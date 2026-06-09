const { db } = require('../../config/database');
const path = require('path');
const fs = require('fs');
const { env } = require('../../config/env');

/**
 * Save avatar filename to user record and return the updated user.
 */
async function saveAvatar(userId, filename) {
  // Remove old avatar file if exists
  const user = db.users.findUnique({
    where: { id: userId },
    select: { avatar: true },
  });

  if (user?.avatar) {
    const oldPath = path.join(path.resolve(env.UPLOAD_DIR), user.avatar);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const updated = db.users.update({
    where: { id: userId },
    data: { avatar: filename },
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
    },
  });

  // Persist to json if expert
  if (updated.role === 'EXPERT') {
    const expertsPath = path.join(__dirname, '../../../data/experts.json');
    if (fs.existsSync(expertsPath)) {
      const experts = JSON.parse(fs.readFileSync(expertsPath, 'utf8'));
      const idx = experts.findIndex(e => e.id === userId);
      if (idx !== -1) {
        experts[idx].avatar = filename;
        fs.writeFileSync(expertsPath, JSON.stringify(experts, null, 2));
      }
    }
  }

  return updated;
}

/**
 * Resolve file path for serving uploaded files.
 */
function getFilePath(filename) {
  const filePath = path.join(path.resolve(env.UPLOAD_DIR), filename);
  if (!fs.existsSync(filePath)) {
    throw Object.assign(new Error('File not found.'), { statusCode: 404 });
  }
  return filePath;
}

module.exports = { saveAvatar, getFilePath };
