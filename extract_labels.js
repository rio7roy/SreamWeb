const fs = require('fs');
const content = fs.readFileSync('c:/Users/maria/Downloads/HUB item - Copy of STREAM 2026.csv', 'utf8');

let inQuotes = false;
let currentField = '';
let fields = [];
const rows = [];

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  if (char === '"') {
    inQuotes = !inQuotes;
  } else if (char === ',' && !inQuotes) {
    fields.push(currentField);
    currentField = '';
  } else if (char === '\n' && !inQuotes) {
    fields.push(currentField);
    rows.push(fields);
    fields = [];
    currentField = '';
  } else if (char !== '\r') {
    currentField += char;
  }
}
if (currentField !== '') fields.push(currentField);
if (fields.length > 0) rows.push(fields);

const sections = new Set();
const labels = new Set();

const headers = rows[0].map(h => h.trim());
const sectionIdx = headers.indexOf('Section');
const labelIdx = headers.indexOf('Label');

for (let i = 1; i < rows.length; i++) {
  if (rows[i][sectionIdx]) sections.add(rows[i][sectionIdx].trim());
  if (rows[i][labelIdx]) labels.add(rows[i][labelIdx].trim());
}

console.log(JSON.stringify({
  sections: Array.from(sections).filter(Boolean),
  labels: Array.from(labels).filter(Boolean)
}, null, 2));
