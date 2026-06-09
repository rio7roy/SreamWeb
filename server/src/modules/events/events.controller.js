const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ExcelJS = require('exceljs');

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
    const { brcCode, venueType, venueValue, name, date, description, teachersCount, studentsCount, status } = req.body;
    
    // Process uploaded photos
    const photos = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

    const newEvent = {
      id: crypto.randomUUID(),
      brcCode,
      venueType: venueType || 'SELECTED_BRC',
      venueValue: venueValue || brcCode,
      name,
      date,
      description,
      teachersCount: parseInt(teachersCount, 10) || 0,
      studentsCount: parseInt(studentsCount, 10) || 0,
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

exports.getDrafts = (req, res) => {
  try {
    const { brcCode } = req.query;
    if (!brcCode) {
      return res.status(400).json({ message: 'brcCode is required' });
    }

    // Return only DRAFT events for this specific BRC created by this user
    const drafts = readEvents().filter(
      e => e.brcCode === brcCode && e.status === 'DRAFT' && e.createdBy === req.user.id
    );

    res.json(drafts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load drafts', error: err.message });
  }
};

exports.updateEvent = (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, description, teachersCount, studentsCount, status, venueType, venueValue } = req.body;
    
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
      teachersCount: teachersCount !== undefined ? parseInt(teachersCount, 10) : existingEvent.teachersCount,
      studentsCount: studentsCount !== undefined ? parseInt(studentsCount, 10) : existingEvent.studentsCount,
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
    const { brcCode } = req.query;
    let events = readEvents().filter(e => e.status === 'SUBMITTED');

    if (brcCode) {
      events = events.filter(e => e.brcCode === brcCode || e.venueValue === brcCode);
    }

    // Sort by most recent first
    events.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events', error: err.message });
  }
};

exports.exportEventsExcel = async (req, res) => {
  try {
    const { brcCode, district } = req.query;
    
    // Read BRCs to map BRC codes to Districts
    let brcs = [];
    try {
      brcs = JSON.parse(fs.readFileSync(BRCS_FILE, 'utf8'));
    } catch(e) {}
    
    const brcMap = {};
    brcs.forEach(b => brcMap[b.code] = b);

    // Read Events
    let events = readEvents().filter(e => e.status === 'SUBMITTED');

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

    // Sort by Date
    events.sort((a, b) => new Date(a.date || a.createdAt) - new Date(b.date || b.createdAt));

    // Create Excel Workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Event Reports');

    worksheet.columns = [
      { header: 'Event Date', key: 'date', width: 15 },
      { header: 'Event Name', key: 'name', width: 30 },
      { header: 'Venue Type', key: 'venueType', width: 15 },
      { header: 'Venue Value', key: 'venueValue', width: 25 },
      { header: 'District', key: 'district', width: 20 },
      { header: 'Teachers Attended', key: 'teachers', width: 20 },
      { header: 'Students Attended', key: 'students', width: 20 },
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
      worksheet.addRow({
        date: new Date(e.date || e.createdAt).toLocaleDateString(),
        name: e.name || 'Untitled Event',
        venueType: e.venueType || 'SELECTED_BRC',
        venueValue: e.venueValue || e.brcCode,
        district: brc ? brc.district : 'N/A',
        teachers: e.teachersCount || 0,
        students: e.studentsCount || 0,
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
