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
 * Generate an Expert's Individual Event PDF Report
 * @param {string} expertId - The ID of the expert
 * @param {string} month - Optional month (1-12)
 * @param {string} year - Optional year
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateExpertEventsPdfReport(expertId, month, year) {
  const events = readData(EVENTS_FILE);
  const experts = readData(EXPERTS_FILE);
  const brcs = readData(BRCS_FILE);
  const brcMap = {};
  brcs.forEach(b => brcMap[b.code] = b);

  let expert;
  if (expertId === 'all') {
    expert = { name: 'All Experts' };
  } else {
    expert = experts.find(e => e.id === expertId);
    if (!expert) {
      throw new Error('Expert not found');
    }
  }

  // Filter events for this expert
  let expertEvents;
  if (expertId === 'all') {
    expertEvents = events.filter(e => e.status === 'SUBMITTED' && e.creatorRole !== 'STREAM_LAB');
  } else {
    expertEvents = events.filter(e => e.status === 'SUBMITTED' && e.createdBy === expertId);
  }

  if (month && year) {
    expertEvents = expertEvents.filter(e => {
      const d = new Date(e.date || e.createdAt);
      return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
    });
  }

  // Sort events chronologically
  expertEvents.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

  // Calculate metrics
  const uniqueDates = new Set();
  let footfall = 0;

  expertEvents.forEach(e => {
    let ts = e.locationTimestamp;
    if (ts) {
      ts = !isNaN(Number(ts)) ? Number(ts) : ts;
    } else {
      ts = e.createdAt;
    }
    const dateStr = new Date(ts).toLocaleDateString();
    uniqueDates.add(dateStr);
    footfall += (e.studentsCount || 0) + (e.teachersCount || 0);
  });

  const totalEvents = expertEvents.length;
  const uniqueDaysCount = uniqueDates.size;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `${expert.name} - Activity Report`,
        Author: 'STREAM Ecosystem',
      },
    });

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    const periodStr = (month && year) 
      ? ` - ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}` 
      : '';

    doc.fillColor('#785900').fontSize(24).font('Helvetica-Bold').text('STREAM Ecosystem', { align: 'left' });
    doc.fillColor('#5f5e5e').fontSize(16).font('Helvetica').text(`Expert Activity Report${periodStr}`, { align: 'left' });
    doc.fillColor('#999999').fontSize(9).text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1.5);
    doc.strokeColor('#FFC107').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Expert Summary Info
    doc.fillColor('#1a1c1c').fontSize(18).font('Helvetica-Bold').text(`Expert: ${expert.name}`);
    doc.moveDown(0.5);
    
    // Summary metrics block
    doc.rect(50, doc.y, 495, 50).fill('#FAFAFA').stroke('#E0E0E0');
    const metricY = doc.y + 15;
    
    doc.fillColor('#785900').fontSize(12).font('Helvetica-Bold').text('Total Events:', 70, metricY);
    doc.fillColor('#1a1c1c').font('Helvetica').text(totalEvents.toString(), 155, metricY);

    doc.fillColor('#785900').font('Helvetica-Bold').text('Unique Days:', 250, metricY);
    doc.fillColor('#1a1c1c').font('Helvetica').text(uniqueDaysCount.toString(), 335, metricY);

    doc.fillColor('#785900').font('Helvetica-Bold').text('Total Footfall:', 420, metricY);
    doc.fillColor('#1a1c1c').font('Helvetica').text(footfall.toString(), 505, metricY);

    doc.moveDown(4); // Move past the rectangle

    // Events Table
    doc.fillColor('#1a1c1c').fontSize(14).font('Helvetica-Bold').text('Conducted Events', 50, doc.y);
    doc.moveDown(1);

    const tableTop = doc.y;
    const isAll = expertId === 'all';
    
    // Columns: [Expert], Event Name, BRC, District, Tag, GPS Date, GPS Loc, Footfall
    const colX = isAll 
      ? [50, 105, 160, 215, 265, 320, 395, 465]
      : [50, 120, 180, 240, 305, 390, 465];

    doc.fillColor('#785900').fontSize(9).font('Helvetica-Bold');
    if (isAll) {
      doc.text('Expert', colX[0], tableTop, { lineBreak: false });
      doc.text('Event Name', colX[1], tableTop, { lineBreak: false });
      doc.text('BRC', colX[2], tableTop, { lineBreak: false });
      doc.text('District', colX[3], tableTop, { lineBreak: false });
      doc.text('Tag', colX[4], tableTop, { lineBreak: false });
      doc.text('Date', colX[5], tableTop, { lineBreak: false });
      doc.text('Location', colX[6], tableTop, { lineBreak: false });
      doc.text('Footfall', colX[7], tableTop, { lineBreak: false });
    } else {
      doc.text('Event Name', colX[0], tableTop, { lineBreak: false });
      doc.text('BRC', colX[1], tableTop, { lineBreak: false });
      doc.text('District', colX[2], tableTop, { lineBreak: false });
      doc.text('Tag', colX[3], tableTop, { lineBreak: false });
      doc.text('GPS Date', colX[4], tableTop, { lineBreak: false });
      doc.text('GPS Location', colX[5], tableTop, { lineBreak: false });
      doc.text('Footfall', colX[6], tableTop, { lineBreak: false });
    }

    doc.text('', 50, tableTop);
    doc.moveDown(0.5);
    doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9).fillColor('#1a1c1c');

    if (expertEvents.length === 0) {
      doc.text("No events found for this selection.", 50, doc.y);
    } else {
      expertEvents.forEach((e, index) => {
        const expName = isAll ? (experts.find(ex => ex.id === e.createdBy)?.name || 'Unknown') : '';
        const colW = isAll ? [50, 50, 50, 45, 50, 70, 65, 30] : [65, 55, 55, 60, 80, 70, 30];
        const rowData = isAll 
          ? [expName, e.name || 'Untitled', brcLabel, districtLabel, eventTag, gpsDateStr, gpsLocStr, evFootfall.toString()]
          : [e.name || 'Untitled Event', brcLabel, districtLabel, eventTag, gpsDateStr, gpsLocStr, evFootfall.toString()];

        doc.font('Helvetica').fontSize(8);
        
        let maxRowHeight = 0;
        rowData.forEach((text, i) => {
          const h = doc.heightOfString(text, { width: colW[i] });
          if (h > maxRowHeight) maxRowHeight = h;
        });

        if (doc.y + maxRowHeight > 750) {
          doc.addPage();
          // redraw header
          const headerY = doc.y;
          doc.fillColor('#785900').fontSize(9).font('Helvetica-Bold');
          if (isAll) {
            doc.text('Expert', colX[0], headerY, { lineBreak: false });
            doc.text('Event Name', colX[1], headerY, { lineBreak: false });
            doc.text('BRC', colX[2], headerY, { lineBreak: false });
            doc.text('District', colX[3], headerY, { lineBreak: false });
            doc.text('Tag', colX[4], headerY, { lineBreak: false });
            doc.text('Date', colX[5], headerY, { lineBreak: false });
            doc.text('Location', colX[6], headerY, { lineBreak: false });
            doc.text('Footfall', colX[7], headerY, { lineBreak: false });
          } else {
            doc.text('Event Name', colX[0], headerY, { lineBreak: false });
            doc.text('BRC', colX[1], headerY, { lineBreak: false });
            doc.text('District', colX[2], headerY, { lineBreak: false });
            doc.text('Tag', colX[3], headerY, { lineBreak: false });
            doc.text('GPS Date', colX[4], headerY, { lineBreak: false });
            doc.text('GPS Location', colX[5], headerY, { lineBreak: false });
            doc.text('Footfall', colX[6], headerY, { lineBreak: false });
          }
          doc.text('', 50, headerY);
          doc.moveDown(0.5);
          doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(8).fillColor('#1a1c1c');
        }

        if (index % 2 === 0) {
          doc.rect(50, doc.y - 2, 495, maxRowHeight + 4).fill('#FAFAFA').fillColor('#1a1c1c');
        }

        const rowTop = doc.y;
        doc.fillColor('#1a1c1c');
        
        rowData.forEach((text, i) => {
          doc.text(text, colX[i], rowTop, { width: colW[i] });
        });

        doc.y = rowTop + maxRowHeight;

        doc.moveDown(0.5);
      });
    }

    // Footer
    if (doc.y > 780) doc.addPage();
    doc.strokeColor('#FFC107').lineWidth(1).moveTo(50, 800).lineTo(545, 800).stroke();
    doc.fillColor('#999999').fontSize(8).text('© 2026 STREAM Ecosystem. Confidential Report.', 50, 810, { align: 'center' });

    doc.end();
  });
}

module.exports = { generateExpertEventsPdfReport };
