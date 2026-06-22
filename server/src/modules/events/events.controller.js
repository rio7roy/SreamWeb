const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const DATA_DIR = path.join(__dirname, '../../../data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const BRCS_FILE = path.join(DATA_DIR, 'brcs.json');

// Ensure events.json exists
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify([]));
}

const readEvents = () => {
  try {
    return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
  } catch (err) {
    return [];
  }
};

const writeEvents = (data) => {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(data, null, 2));
};

exports.createEvent = (req, res) => {
  try {
    const { brcCode, venueType, venueValue, name, date, description, teachersCount, studentsCount, status, latitude, longitude, locationTimestamp, tag, customTag } = req.body;
    
    // Process uploaded photos
    const photos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const newEvent = {
      id: crypto.randomBytes(16).toString('hex'),
      brcCode,
      venueType: venueType || 'SELECTED_BRC',
      venueValue: venueValue || brcCode,
      name,
      date,
      description,
      teachersCount: !isNaN(parseInt(teachersCount, 10)) ? parseInt(teachersCount, 10) : 0,
      studentsCount: !isNaN(parseInt(studentsCount, 10)) ? parseInt(studentsCount, 10) : 0,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      locationTimestamp: locationTimestamp || null,
      tag: tag || null,
      customTag: tag === 'other event' ? (customTag || null) : null,
      photos,
      status: status || 'DRAFT', // 'DRAFT' or 'SUBMITTED'
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    const events = readEvents();
    events.push(newEvent);
    writeEvents(events);

    res.status(201).json({ message: 'Event saved successfully', data: newEvent });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save event', error: err.message });
  }
};

exports.getEventStats = (req, res) => {
  try {
    const { brcCode } = req.query;
    if (!brcCode) {
      return res.status(400).json({ message: 'brcCode is required' });
    }

    const events = readEvents().filter(e => e.brcCode === brcCode);

    let totalReported = 0;
    let totalDrafted = 0;
    let studentFootfall = 0;
    let teacherFootfall = 0;

    events.forEach(e => {
      if (e.status === 'SUBMITTED') {
        totalReported++;
        studentFootfall += e.studentsCount;
        teacherFootfall += e.teachersCount;
      } else if (e.status === 'DRAFT') {
        totalDrafted++;
      }
    });

    res.json({
      totalReported,
      totalDrafted,
      studentFootfall,
      teacherFootfall
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load stats', error: err.message });
  }
};

exports.uploadReportPdf = (req, res) => {
  try {
    const { id } = req.params;
    const events = readEvents();
    const eventIndex = events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No PDF file uploaded' });
    }

    const reportPdf = `/uploads/${req.file.filename}`;
    events[eventIndex].reportPdf = reportPdf;
    events[eventIndex].updatedAt = new Date().toISOString();

    writeEvents(events);

    res.json({ message: 'PDF report uploaded successfully', data: events[eventIndex] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to upload PDF report', error: err.message });
  }
};

exports.deleteEvent = (req, res) => {
  try {
    const { id } = req.params;
    const events = readEvents();
    const eventIndex = events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (events[eventIndex].createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized to delete this event' });
    }

    events.splice(eventIndex, 1);
    writeEvents(events);

    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event', error: err.message });
  }
};

exports.getDrafts = (req, res) => {
  try {
    const { brcCode } = req.query;
    if (!brcCode) {
      return res.status(400).json({ message: 'brcCode is required' });
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    // Return only DRAFT events for this specific BRC created by this user
    // Filter out drafts older than 24 hours
    const allEvents = readEvents();
    let eventsChanged = false;

    const drafts = allEvents.filter(e => {
      if (e.brcCode === brcCode && e.status === 'DRAFT' && e.createdBy === req.user.id) {
        const age = now - new Date(e.createdAt).getTime();
        if (age > TWENTY_FOUR_HOURS) {
          e.expired = true; // Mark for cleanup
          eventsChanged = true;
          return false;
        }
        return true;
      }
      return false;
    });

    if (eventsChanged) {
      // Actually purge expired drafts
      const cleanEvents = allEvents.filter(e => !e.expired);
      writeEvents(cleanEvents);
    }

    res.json(drafts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load drafts', error: err.message });
  }
};

exports.updateEvent = (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, description, teachersCount, studentsCount, status, venueType, venueValue, latitude, longitude, locationTimestamp, tag, customTag } = req.body;
    
    const events = readEvents();
    const eventIndex = events.findIndex(e => e.id === id);

    if (eventIndex === -1) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const existingEvent = events[eventIndex];

    // Ensure the user owns this draft
    if (existingEvent.createdBy !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to edit this event' });
    }

    // Process uploaded photos (append to existing)
    const newPhotos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    const updatedPhotos = [...(existingEvent.photos || []), ...newPhotos];

    const updatedEvent = {
      ...existingEvent,
      name: name || existingEvent.name,
      date: date || existingEvent.date,
      description: description || existingEvent.description,
      teachersCount: teachersCount !== undefined && !isNaN(parseInt(teachersCount, 10)) ? parseInt(teachersCount, 10) : existingEvent.teachersCount,
      studentsCount: studentsCount !== undefined && !isNaN(parseInt(studentsCount, 10)) ? parseInt(studentsCount, 10) : existingEvent.studentsCount,
      latitude: latitude ? parseFloat(latitude) : existingEvent.latitude,
      longitude: longitude ? parseFloat(longitude) : existingEvent.longitude,
      locationTimestamp: locationTimestamp || existingEvent.locationTimestamp,
      tag: tag !== undefined ? tag : existingEvent.tag,
      customTag: tag === 'other event' ? customTag : (tag !== undefined ? null : existingEvent.customTag),
      venueType: venueType || existingEvent.venueType,
      venueValue: venueValue || existingEvent.venueValue,
      status: status || existingEvent.status, // Move to SUBMITTED or keep as DRAFT
      photos: updatedPhotos,
      updatedAt: new Date().toISOString()
    };

    events[eventIndex] = updatedEvent;
    writeEvents(events);

    res.json({ message: 'Event updated successfully', data: updatedEvent });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update event', error: err.message });
  }
};

exports.getEvents = (req, res) => {
  try {
    const { brcCode, district, month, mine, expertId } = req.query;
    let events = readEvents();

    if (mine === 'true') {
      events = events.filter(e => e.createdBy === req.user.id);
    }

    if (expertId) {
      events = events.filter(e => e.createdBy === expertId);
    }

    // Clean up expired drafts while we're fetching events
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const cleanEvents = events.filter(e => {
      if (e.status === 'DRAFT') {
        const age = now - new Date(e.createdAt).getTime();
        return age <= TWENTY_FOUR_HOURS;
      }
      return true;
    });
    
    if (cleanEvents.length !== events.length) {
      writeEvents(cleanEvents);
      events = cleanEvents;
    }
    
    events = events.filter(e => e.status === 'SUBMITTED');

    // Read BRCs to map BRC codes to Districts
    let brcs = [];
    try {
      brcs = JSON.parse(fs.readFileSync(BRCS_FILE, 'utf8'));
    } catch(e) {}
    
    const brcMap = {};
    brcs.forEach(b => brcMap[b.code] = b);

    // Filter by District
    if (district) {
      events = events.filter(e => {
        const brc = brcMap[e.brcCode];
        return brc && brc.district === district;
      });
    }

    if (brcCode) {
      events = events.filter(e => e.brcCode === brcCode || e.venueValue === brcCode);
    }
    
    if (month) {
      events = events.filter(e => {
        const date = new Date(e.date || e.createdAt);
        return (date.getMonth() + 1).toString() === month;
      });
    }

    // Sort by most recent first
    events.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const eventsWithNames = events.map(e => ({
      ...e,
      brcName: brcMap[e.brcCode]?.name || e.brcCode,
      brcLocation: brcMap[e.brcCode]?.location || e.brcCode
    }));

    res.json(eventsWithNames);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

exports.exportEventsExcel = async (req, res) => {
  try {
    const { brcCode, district, month, mine, expertId } = req.query;
    
    // Read BRCs to map BRC codes to Districts
    let brcs = [];
    try {
      brcs = JSON.parse(fs.readFileSync(BRCS_FILE, 'utf8'));
    } catch(e) {}
    
    const brcMap = {};
    brcs.forEach(b => brcMap[b.code] = b);

    // Read Events
    let events = readEvents().filter(e => e.status === 'SUBMITTED');

    if (mine === 'true') {
      events = events.filter(e => e.createdBy === req.user.id);
    }

    if (expertId) {
      events = events.filter(e => e.createdBy === expertId);
    }

    // Filter by District
    if (district) {
      events = events.filter(e => {
        const brc = brcMap[e.brcCode];
        return brc && brc.district === district;
      });
    }

    // Filter by BRC Code
    if (brcCode) {
      events = events.filter(e => e.brcCode === brcCode || e.venueValue === brcCode);
    }
    
    // Filter by Month
    if (month) {
      events = events.filter(e => {
        const date = new Date(e.date || e.createdAt);
        return (date.getMonth() + 1).toString() === month;
      });
    }

    // Sort by Date
    events.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Event Reports');

    worksheet.columns = [
      { header: 'Event Date', key: 'date', width: 15 },
      { header: 'Event Name', key: 'name', width: 30 },
      { header: 'BRC Location', key: 'brcLocation', width: 20 },
      { header: 'GPS Timestamp', key: 'gpsTime', width: 25 },
      { header: 'Venue Type', key: 'venueType', width: 15 },
      { header: 'Venue Value', key: 'venueValue', width: 25 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Teachers Attended', key: 'teachers', width: 20 },
      { header: 'Students Attended', key: 'students', width: 20 },
      { header: 'Event Tag', key: 'tag', width: 25 },
      { header: 'Description', key: 'desc', width: 50 },
    ];

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add rows
    events.forEach(e => {
      const brc = brcMap[e.brcCode];
      const isOther = e.venueType === 'OTHER_BRC' || e.tag === 'other event';
      worksheet.addRow({
        date: new Date(e.date || e.createdAt).toLocaleDateString(),
        name: e.name || 'Untitled Event',
        brcLocation: (brc ? brc.location : e.brcCode) + (isOther ? ' [OTHER]' : ''),
        gpsTime: e.locationTimestamp ? new Date(parseInt(e.locationTimestamp)).toLocaleString() : 'N/A',
        venueType: e.venueType || 'SELECTED_BRC',
        venueValue: e.venueValue || e.brcCode,
        district: brc ? brc.district : 'N/A',
        teachers: e.teachersCount || 0,
        students: e.studentsCount || 0,
        tag: isOther ? 'OTHER' : (e.tag === 'other event' ? (e.customTag || 'OTHER') : e.tag || 'N/A'),
        desc: e.description || '',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'Event_Reports.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate Excel report', error: err.message });
  }
};

exports.exportEventsPdf = async (req, res) => {
  try {
    const { brcCode, district, month, mine, expertId } = req.query;
    let events = readEvents().filter(e => e.status === 'SUBMITTED');

    if (mine === 'true') {
      events = events.filter(e => e.createdBy === req.user.id);
    }

    if (expertId) {
      events = events.filter(e => e.createdBy === expertId);
    }

    let brcs = [];
    try { brcs = JSON.parse(fs.readFileSync(BRCS_FILE, 'utf8')); } catch(e) {}
    const brcMap = {};
    brcs.forEach(b => brcMap[b.code] = b);

    if (district) {
      events = events.filter(e => {
        const brc = brcMap[e.brcCode];
        return brc && brc.district === district;
      });
    }

    if (brcCode) {
      events = events.filter(e => e.brcCode === brcCode || e.venueValue === brcCode);
    }
    
    if (month) {
      events = events.filter(e => {
        const date = new Date(e.date || e.createdAt);
        return (date.getMonth() + 1).toString() === month;
      });
    }

    events.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Event_Reports.pdf');
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('STREAM Hub Event Reports', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    
    // Add filters used to the heading
    const filterParts = [];
    if (district) filterParts.push(`District: ${district}`);
    if (brcCode) filterParts.push(`Hub Code: ${brcCode}`);
    if (month) filterParts.push(`Month: ${new Date(0, month - 1).toLocaleString('default', { month: 'long' })}`);
    
    // For expert name, we can try to fetch it if expertId is present
    if (expertId) {
      try {
        const EXPERTS_FILE = require('path').join(__dirname, '../../../data/experts.json');
        const experts = JSON.parse(fs.readFileSync(EXPERTS_FILE, 'utf8'));
        const expertName = experts.find(e => e.id === expertId)?.name || expertId;
        filterParts.push(`Expert: ${expertName}`);
      } catch (e) {
        filterParts.push(`Expert ID: ${expertId}`);
      }
    }
    
    if (filterParts.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Oblique').text(`Filters Applied: ${filterParts.join(' | ')}`, { align: 'center' });
    }
    
    doc.moveDown(2);

    if (events.length === 0) {
      doc.fontSize(14).text('No events found for the selected filters.', { align: 'center' });
    } else {
      events.forEach((event, index) => {
        doc.fontSize(14).font('Helvetica-Bold').text(`${index + 1}. ${event.name}`);
        doc.fontSize(10).font('Helvetica').text(`Date: ${new Date(event.date || event.createdAt).toLocaleDateString()}`);
        const pdfBrc = brcMap[event.brcCode];
        const pdfBrcLabel = pdfBrc ? pdfBrc.location : event.brcCode;
        const pdfIsOther = event.venueType === 'OTHER_BRC' || event.tag === 'other event';
        doc.text(`BRC: ${pdfBrcLabel}${pdfIsOther ? ' [OTHER]' : ''}`);
        const displayTag = event.venueType === 'OTHER_BRC' ? 'OTHER' : (event.tag === 'other event' ? (event.customTag || 'OTHER') : event.tag || 'N/A');
        doc.text(`Tag: ${displayTag}`);
        doc.text(`Attendance: ${event.teachersCount} Teachers, ${event.studentsCount} Students`);
        
        if (event.description) {
          doc.moveDown(0.5);
          doc.text(`Description: ${event.description}`);
        }
        
        doc.moveDown(1.5);
      });
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ message: 'Failed to export PDF', error: err.message });
  }
};
