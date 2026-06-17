const formsService = require('./forms.service');

exports.getTemplates = (req, res) => {
  const templates = formsService.getTemplates();
  res.json(templates);
};

exports.createTemplate = (req, res) => {
  try {
    const template = formsService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create template' });
  }
};

exports.getForms = (req, res) => {
  // If the user is an expert, filter forms assigned to them or created by them.
  // Admins see all. We assume req.user is set by authMiddleware.
  let forms = formsService.getForms();
  
  if (req.user && req.user.role === 'EXPERT') {
    forms = forms.filter(f => f.createdBy === req.user.id || (f.assignedTo && f.assignedTo.some(brc => req.user.assignedBrcs?.includes(brc))));
  }
  
  res.json(forms);
};

exports.createForm = (req, res) => {
  try {
    const formData = {
      ...req.body,
      createdBy: req.user ? req.user.id : 'unknown'
    };
    const form = formsService.createForm(formData);
    res.status(201).json(form);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create form' });
  }
};

exports.getFormById = (req, res) => {
  const form = formsService.getFormById(req.params.id);
  if (!form) return res.status(404).json({ message: 'Form not found' });
  res.json(form);
};

exports.updateForm = async (req, res) => {
  const oldForm = formsService.getFormById(req.params.id);
  const form = formsService.updateForm(req.params.id, req.body);
  if (!form) return res.status(404).json({ message: 'Form not found' });

  // Check if assignedTo has changed
  if (req.body.assignedTo && oldForm) {
    const oldAssigned = oldForm.assignedTo || [];
    const newAssigned = form.assignedTo || [];
    const newlyAssigned = newAssigned.filter(brc => !oldAssigned.includes(brc));

    if (newlyAssigned.length > 0) {
      try {
        const { sendFormAssignmentEmail } = require('../../utils/mailer');
        const path = require('path');
        const fs = require('fs');
        // experts.json is at server/data/experts.json
        const expertsPath = path.join(__dirname, '../../../data/experts.json');
        if (fs.existsSync(expertsPath)) {
          const experts = JSON.parse(fs.readFileSync(expertsPath, 'utf8'));
          
          const notifiedEmails = new Set();
          
          experts.forEach(expert => {
            if (expert.role === 'EXPERT' && expert.assignedBrcs) {
              const hasNewBrc = expert.assignedBrcs.some(b => newlyAssigned.includes(b));
              if (hasNewBrc && expert.email && !notifiedEmails.has(expert.email)) {
                notifiedEmails.add(expert.email);
                const formLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/portal?form=${form.id}`;
                sendFormAssignmentEmail(expert.email, expert.name || 'STREAM Expert', form.title || 'New Survey', formLink);
              }
            }
          });
        }
      } catch (err) {
        console.error('Error sending form assignment emails:', err);
      }
    }
  }

  res.json(form);
};

exports.deleteForm = (req, res) => {
  const success = formsService.deleteForm(req.params.id);
  if (!success) return res.status(404).json({ message: 'Form not found' });
  res.json({ message: 'Form deleted successfully' });
};

exports.getResponses = (req, res) => {
  const responses = formsService.getResponses(req.params.id);
  res.json(responses);
};

exports.submitResponse = (req, res) => {
  try {
    const form = formsService.getFormById(req.params.id);
    if (!form) return res.status(404).json({ message: 'Form not found' });
    if (!form.published) return res.status(400).json({ message: 'Form is not published yet' });

    const response = formsService.submitResponse(req.params.id, req.body);
    res.status(201).json(response);
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit response' });
  }
};
