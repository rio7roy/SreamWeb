const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DATA_DIR = path.join(__dirname, '../../../data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const EXPERTS_FILE = path.join(DATA_DIR, 'experts.json');
const BRCS_FILE = path.join(DATA_DIR, 'brcs.json');

const readData = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return [];
  }
};

/**
 * Generate a Month-End PDF Report
 * @param {string} month - The month number (1-12)
 * @param {string} year - The year (e.g., 2026)
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateMonthEndPdfReport(month, year) {
  const events = readData(EVENTS_FILE);
  const experts = readData(EXPERTS_FILE);
  const brcs = readData(BRCS_FILE);

  const expertMap = {};
  experts.forEach(e => expertMap[e.id] = e);

  const brcMap = {};
  brcs.forEach(b => brcMap[b.code] = b);

  // Filter events
  const targetMonth = month ? parseInt(month, 10) : null;
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  const filteredEvents = events.filter(e => {
    if (e.status !== 'SUBMITTED') return false;
    const eventDate = new Date(e.date || e.createdAt);
    
    if (targetMonth && (eventDate.getMonth() + 1) !== targetMonth) return false;
    if (eventDate.getFullYear() !== targetYear) return false;
    return true;
  });

  // Calculate Expert Stats
  const expertStats = {};
  // Calculate Hub Stats
  const hubStats = {};

  filteredEvents.forEach(e => {
    // Expert
    if (e.createdBy && e.createdBy !== 'unknown') {
      if (!expertStats[e.createdBy]) {
        expertStats[e.createdBy] = {
          id: e.createdBy,
          name: expertMap[e.createdBy] ? expertMap[e.createdBy].name : 'Unknown Expert',
          programs: 0,
          footfall: 0,
          dates: new Set()
        };
      }
      expertStats[e.createdBy].programs += 1;
      expertStats[e.createdBy].footfall += (e.studentsCount || 0) + (e.teachersCount || 0);
      const dateStr = new Date(e.date || e.createdAt).toISOString().split('T')[0];
      expertStats[e.createdBy].dates.add(dateStr);
    }

    // Hub
    if (e.brcCode) {
      if (!hubStats[e.brcCode]) {
        hubStats[e.brcCode] = {
          code: e.brcCode,
          name: brcMap[e.brcCode] ? brcMap[e.brcCode].name : e.brcCode,
          district: brcMap[e.brcCode] ? brcMap[e.brcCode].district : 'Unknown',
          programs: 0,
          footfall: 0,
          dates: new Set()
        };
      }
      hubStats[e.brcCode].programs += 1;
      hubStats[e.brcCode].footfall += (e.studentsCount || 0) + (e.teachersCount || 0);
      const dateStr = new Date(e.date || e.createdAt).toISOString().split('T')[0];
      hubStats[e.brcCode].dates.add(dateStr);
    }
  });

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const titleMonth = targetMonth ? monthNames[targetMonth - 1] : "All Time";
  const reportTitle = `Month-End Report - ${titleMonth} ${targetYear}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: reportTitle,
        Author: 'STREAM Ecosystem',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fillColor('#785900').fontSize(24).font('Helvetica-Bold').text('STREAM Ecosystem', { align: 'left' });
    doc.fillColor('#5f5e5e').fontSize(14).font('Helvetica').text(reportTitle, { align: 'left' });
    doc.fillColor('#999999').fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1.5);
    doc.strokeColor('#FFC107').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Helper to draw a table
    const drawTable = (title, headers, data) => {
      if (doc.y > 700) doc.addPage();
      
      doc.fillColor('#1a1c1c').fontSize(16).font('Helvetica-Bold').text(title, { align: 'left' });
      doc.moveDown(1);

      const tableTop = doc.y;
      
      // Determine if this is a 4-column table (Expert) or 5-column table (Hub)
      const isFiveColumns = headers.length === 5;
      const colX = isFiveColumns ? [50, 200, 300, 380, 460] : [50, 250, 350, 450];

      doc.fillColor('#785900').fontSize(10).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { lineBreak: false }));

      // Move down after headers
      doc.text('', 50, tableTop);
      doc.moveDown(1);
      doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      doc.font('Helvetica').fontSize(9).fillColor('#1a1c1c');

      data.forEach((row, index) => {
        if (doc.y > 750) {
          doc.addPage();
          // redraw header
          const headerY = doc.y;
          doc.fillColor('#785900').fontSize(10).font('Helvetica-Bold');
          headers.forEach((h, i) => doc.text(h, colX[i], headerY, { lineBreak: false }));
          doc.text('', 50, headerY);
          doc.moveDown(1);
          doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9).fillColor('#1a1c1c');
        }

        if (index % 2 === 0) {
          doc.rect(50, doc.y - 2, 495, 16).fill('#FAFAFA').fillColor('#1a1c1c');
        }

        const rowY = doc.y;
        doc.text(row[0], colX[0], rowY, { width: isFiveColumns ? 140 : 190, ellipsis: true, lineBreak: false });
        doc.text(row[1].toString(), colX[1], rowY, { width: isFiveColumns ? 90 : undefined, ellipsis: true, lineBreak: false });
        doc.text(row[2].toString(), colX[2], rowY, { lineBreak: false });
        doc.text(row[3].toString(), colX[3], rowY, { lineBreak: false });
        if (isFiveColumns) {
          doc.text(row[4].toString(), colX[4], rowY, { lineBreak: false });
        }

        doc.text('', 50, rowY);
        doc.moveDown(1.5);
      });
      doc.moveDown(2);
    };

    // Expert Data
    const expertDataArray = Object.values(expertStats).sort((a, b) => b.programs - a.programs).map(e => [
      e.name,
      e.programs,
      e.dates.size,
      e.footfall
    ]);
    if (expertDataArray.length === 0) expertDataArray.push(["No data", "-", "-", "-"]);
    drawTable("Expert Performance", ["Expert Name", "Programs", "Unique Days", "Footfall"], expertDataArray);

    // Hub Data
    const hubDataArray = Object.values(hubStats).sort((a, b) => b.programs - a.programs).map(h => [
      h.name,
      h.district,
      h.programs,
      h.dates.size,
      h.footfall
    ]);
    if (hubDataArray.length === 0) hubDataArray.push(["No data", "-", "-", "-", "-"]);
    drawTable("STREAM Hub Performance", ["Hub Name", "District", "Programs", "Unique Days", "Footfall"], hubDataArray);

    // Footer
    doc.strokeColor('#FFC107').lineWidth(1).moveTo(50, 800).lineTo(545, 800).stroke();
    doc.fillColor('#999999').fontSize(8).text('© 2026 STREAM Ecosystem. Confidential Report.', 50, 810, { align: 'center' });

    doc.end();
  });
}

module.exports = { generateMonthEndPdfReport };
