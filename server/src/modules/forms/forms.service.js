const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../../data');
const FORMS_FILE = path.join(DATA_DIR, 'forms.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'form_templates.json');
const RESPONSES_FILE = path.join(DATA_DIR, 'form_responses.json');

const readData = (filePath) => {
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeData = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

exports.getTemplates = () => readData(TEMPLATES_FILE);

exports.createTemplate = (data) => {
  const templates = readData(TEMPLATES_FILE);
  const newTemplate = {
    id: crypto.randomBytes(16).toString('hex'),
    ...data,
    createdAt: new Date().toISOString()
  };
  templates.push(newTemplate);
  writeData(TEMPLATES_FILE, templates);
  return newTemplate;
};

exports.getForms = () => readData(FORMS_FILE);

exports.createForm = (data) => {
  const forms = readData(FORMS_FILE);
  const newForm = {
    id: crypto.randomBytes(16).toString('hex'),
    ...data,
    published: false,
    createdAt: new Date().toISOString()
  };
  forms.push(newForm);
  writeData(FORMS_FILE, forms);
  return newForm;
};

exports.getFormById = (id) => {
  const forms = readData(FORMS_FILE);
  return forms.find(f => f.id === id);
};

exports.updateForm = (id, updates) => {
  const forms = readData(FORMS_FILE);
  const index = forms.findIndex(f => f.id === id);
  if (index === -1) return null;

  forms[index] = { ...forms[index], ...updates, updatedAt: new Date().toISOString() };
  writeData(FORMS_FILE, forms);
  return forms[index];
};

exports.deleteForm = (id) => {
  const forms = readData(FORMS_FILE);
  const filteredForms = forms.filter(f => f.id !== id);
  if (filteredForms.length === forms.length) return false;
  writeData(FORMS_FILE, filteredForms);
  return true;
};

exports.getResponses = (formId) => {
  const responses = readData(RESPONSES_FILE);
  return responses.filter(r => r.formId === formId);
};

exports.submitResponse = (formId, data) => {
  const responses = readData(RESPONSES_FILE);
  const newResponse = {
    id: crypto.randomBytes(16).toString('hex'),
    formId,
    answers: data.answers || {},
    submittedBy: data.submittedBy || 'anonymous',
    submittedAt: new Date().toISOString()
  };
  responses.push(newResponse);
  writeData(RESPONSES_FILE, responses);
  return newResponse;
};
