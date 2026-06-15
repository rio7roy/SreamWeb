const fs = require('fs');
const path = require('path');

const csvPath = 'C:/Users/maria/Downloads/HUB item - Copy of STREAM 2026.csv';
const raw = fs.readFileSync(csvPath, 'utf8');

// Split into lines — handle the multi-line header ("New\nQty")
const lines = raw.split(/\r?\n/);

// First two lines form the header due to "New\nQty" being split
// Header: #, Unique ID, Item, Category, New Qty, Section, Label, IMG, space code
// We skip the header lines (lines 0 and 1 which together form the header)

const items = [];
let lineIdx = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // Skip header lines
  if (line.startsWith('#,Unique') || line.startsWith('Qty",Section') || line.startsWith('Qty,Section')) continue;
  
  // Parse CSV with proper quote handling
  const fields = parseCSVLine(line);
  
  if (fields.length < 5) continue;
  
  const num = fields[0]?.trim();
  // Skip if first field is not a number
  if (!num || isNaN(parseInt(num))) continue;
  
  const uniqueId = fields[1]?.trim() || '';
  const itemName = fields[2]?.trim() || '';
  const category = fields[3]?.trim() || '';
  const newQtyRaw = fields[4]?.trim() || '0';
  const section = fields[5]?.trim() || '';
  const label = fields[6]?.trim() || '';
  const img = fields[7]?.trim() || '';
  const spaceCode = fields[8]?.trim() || '';
  
  // Parse qty - handle cases like "2L", "5L" etc.
  let newQty = parseInt(newQtyRaw);
  if (isNaN(newQty)) newQty = 1;
  
  items.push({
    uniqueId: uniqueId || `ITEM-${num}`,
    itemName,
    category,
    newQty,
    section,
    label,
    img: (img && img !== '#VALUE!') ? img : '',
    spaceCode,
    status: 'ACTIVE',
    availableQty: newQty,
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// Write output
const outputPath = path.resolve(__dirname, 'data', 'stocks.json');
fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));

console.log(`✅ Parsed ${items.length} items from CSV`);
console.log(`Saved to: ${outputPath}`);

// Print category breakdown
const cats = {};
items.forEach(i => { cats[i.category] = (cats[i.category] || 0) + 1; });
console.log('\nCategory breakdown:');
Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`  ${cat}: ${count}`);
});
