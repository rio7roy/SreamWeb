const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'server', 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const files = [
  'experts.json', 'past_experts.json',
  'labs.json', 'past_labs.json',
  'ilabs.json', 'past_ilabs.json',
  'creative_corners.json', 'past_creative_corners.json',
  'messages.json'
];

for (const file of files) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
}

console.log('JSON data files initialized.');
