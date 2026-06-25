const { db } = require('../../config/database');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

/**
 * Generate an Excel report of all users.
 * @returns {Buffer} Excel file buffer
 */
async function generateUserExcelReport() {
  const { data: users } = db.users.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'STREAM Ecosystem';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Users', {
    headerFooter: {
      firstHeader: 'STREAM Ecosystem — User Report',
    },
  });

  // Define columns
  sheet.columns = [
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Username', key: 'username', width: 20 },
    { header: 'Role', key: 'role', width: 18 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Last Login', key: 'lastLogin', width: 22 },
    { header: 'Created', key: 'created', width: 22 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF785900' },
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Add data rows
  users.forEach((user) => {
    sheet.addRow({
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role.replace('_', ' '),
      status: user.isActive ? 'Active' : 'Inactive',
      lastLogin: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never',
      created: new Date(user.createdAt).toLocaleString(),
    });
  });

  // Apply alternating row colors
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && rowNumber % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF8E1' },
      };
    }
    row.border = {
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
    };
  });

  // Auto-filter
  sheet.autoFilter = {
    from: 'A1',
    to: `G${users.length + 1}`,
  };

  return workbook.xlsx.writeBuffer();
}

/**
 * Generate a PDF report of all users.
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateUserPdfReport() {
  const { data: users } = db.users.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: 'STREAM Ecosystem — User Report',
        Author: 'STREAM Ecosystem',
        Creator: 'STREAM Report Engine',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // ── Header ──
    doc
      .fillColor('#785900')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('STREAM Ecosystem', { align: 'left' });

    doc
      .fillColor('#5f5e5e')
      .fontSize(12)
      .font('Helvetica')
      .text('User Report', { align: 'left' });

    doc
      .fillColor('#999999')
      .fontSize(9)
      .text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });

    doc.moveDown(1.5);

    // ── Divider ──
    doc
      .strokeColor('#FFC107')
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(1);

    // ── Summary ──
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.isActive).length;

    doc
      .fillColor('#1a1c1c')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(`Total Users: ${totalUsers}    |    Active: ${activeUsers}    |    Inactive: ${totalUsers - activeUsers}`);

    doc.moveDown(1);

    // ── Table Header ──
    const tableTop = doc.y;
    const col = { name: 50, email: 180, role: 350, status: 450 };

    doc
      .fillColor('#785900')
      .fontSize(9)
      .font('Helvetica-Bold');

    doc.text('Name', col.name, tableTop, { lineBreak: false });
    doc.text('Email', col.email, tableTop, { lineBreak: false });
    doc.text('Role', col.role, tableTop, { lineBreak: false });
    doc.text('Status', col.status, tableTop, { lineBreak: false });

    doc.text('', 50, tableTop);
    doc.moveDown(0.5);
    doc
      .strokeColor('#E0E0E0')
      .lineWidth(0.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.3);

    // ── Table Rows ──
    doc.font('Helvetica').fontSize(8).fillColor('#1a1c1c');

    users.forEach((user, index) => {
      // Check page break
      if (doc.y > 750) {
        doc.addPage();
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc
          .rect(50, doc.y - 2, 495, 16)
          .fill('#FAFAFA')
          .fillColor('#1a1c1c');
      }

      const rowY = doc.y;
      doc.text(user.name, col.name, rowY, { width: 120, ellipsis: true, lineBreak: false });
      doc.text(user.email, col.email, rowY, { width: 160, ellipsis: true, lineBreak: false });
      doc.text(user.role.replace('_', ' '), col.role, rowY, { width: 90, ellipsis: true, lineBreak: false });
      doc.text(user.isActive ? 'Active' : 'Inactive', col.status, rowY, { width: 90, ellipsis: true, lineBreak: false });

      doc.text('', 50, rowY);
      doc.moveDown(1.5);
    });

    // ── Footer ──
    doc.moveDown(2);
    doc
      .strokeColor('#FFC107')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.5);
    doc
      .fillColor('#999999')
      .fontSize(8)
      .text('© 2026 STREAM Ecosystem. This report is confidential.', {
        align: 'center',
      });

    doc.end();
  });
}

module.exports = { generateUserExcelReport, generateUserPdfReport };
