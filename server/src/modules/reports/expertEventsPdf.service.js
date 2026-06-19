const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const DATA_DIR = path.join(__dirname, '../../../data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const EXPERTS_FILE = path.join(DATA_DIR, 'experts.json');

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
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generateExpertEventsPdfReport(expertId) {
  const events = readData(EVENTS_FILE);
  const experts = readData(EXPERTS_FILE);

  const expert = experts.find(e => e.id === expertId);
  if (!expert) {
    throw new Error('Expert not found');
  }

  // Filter events for this expert
  const expertEvents = events.filter(e => e.status === 'SUBMITTED' && e.createdBy === expertId);

  // Sort events chronologically
  expertEvents.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

  // Calculate metrics
  const uniqueDates = new Set();
  let footfall = 0;

  expertEvents.forEach(e => {
    const dateStr = new Date(e.date || e.createdAt).toISOString().split('T')[0];
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
    doc.fillColor('#785900').fontSize(24).font('Helvetica-Bold').text('STREAM Ecosystem', { align: 'left' });
    doc.fillColor('#5f5e5e').fontSize(16).font('Helvetica').text('Expert Activity Report', { align: 'left' });
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
    const colX = [50, 200, 320, 480]; // Event Name, GPS Date, GPS Location, Footfall

    doc.fillColor('#785900').fontSize(10).font('Helvetica-Bold');
    doc.text('Event Name', colX[0], tableTop);
    doc.text('GPS Marked Date', colX[1], tableTop);
    doc.text('GPS Location', colX[2], tableTop);
    doc.text('Footfall', colX[3], tableTop);

    doc.moveDown(0.5);
    doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica').fontSize(9).fillColor('#1a1c1c');

    if (expertEvents.length === 0) {
      doc.text("No events found for this expert.", 50, doc.y);
    } else {
      expertEvents.forEach((e, index) => {
        if (doc.y > 750) {
          doc.addPage();
          // redraw header
          doc.fillColor('#785900').fontSize(10).font('Helvetica-Bold');
          doc.text('Event Name', colX[0], doc.y);
          doc.text('GPS Marked Date', colX[1], doc.y);
          doc.text('GPS Location', colX[2], doc.y);
          doc.text('Footfall', colX[3], doc.y);
          doc.moveDown(0.5);
          doc.strokeColor('#E0E0E0').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
          doc.moveDown(0.5);
          doc.font('Helvetica').fontSize(9).fillColor('#1a1c1c');
        }

        if (index % 2 === 0) {
          doc.rect(50, doc.y - 2, 495, 16).fill('#FAFAFA').fillColor('#1a1c1c');
        }

        const rowY = doc.y;
        
        // Formulate GPS Date
        let gpsDateStr = 'N/A';
        if (e.locationTimestamp) {
          const ts = !isNaN(Number(e.locationTimestamp)) ? Number(e.locationTimestamp) : e.locationTimestamp;
          gpsDateStr = new Date(ts).toLocaleString();
        } else {
          gpsDateStr = new Date(e.createdAt).toLocaleString();
        }

        // Formulate GPS Location
        let gpsLocStr = 'N/A';
        if (e.latitude && e.longitude) {
          gpsLocStr = `${parseFloat(e.latitude).toFixed(4)}, ${parseFloat(e.longitude).toFixed(4)}`;
        }

        const evFootfall = (e.studentsCount || 0) + (e.teachersCount || 0);

        // Limit the strings to 1 line (lineBreak: false) so they don't wrap and overlap the next row
        doc.text(e.name || 'Unnamed Event', colX[0], rowY, { width: 140, lineBreak: false, ellipsis: true });
        doc.text(gpsDateStr, colX[1], rowY, { width: 110, lineBreak: false, ellipsis: true });
        doc.text(gpsLocStr, colX[2], rowY, { width: 150, lineBreak: false, ellipsis: true });
        doc.text(evFootfall.toString(), colX[3], rowY, { width: 50, lineBreak: false, ellipsis: true });

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
