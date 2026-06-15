const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const htmlPath = 'C:/Users/maria/Downloads/HUB item/Copy of STREAM 2026.html';
const stocksPath = path.join(__dirname, 'data', 'stocks.json');

async function updateSectionLabel() {
  console.log('Reading HTML file...');
  const html = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(html);
  
  let stocks = [];
  if (fs.existsSync(stocksPath)) {
    stocks = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));
  } else {
    console.error('stocks.json not found!');
    return;
  }

  const rows = $('table tbody tr').toArray();
  console.log(`Found ${rows.length} rows in HTML table.`);

  let updatedCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const cells = $(rows[i]).find('td').toArray();
    if (cells.length < 9) continue; // Skip header or malformed rows

    // Cell 1 is Unique ID
    const uniqueId = $(cells[1]).text().trim();
    if (!uniqueId || uniqueId === 'Unique ID') continue;

    // Cell 5 is Section
    const section = $(cells[5]).text().trim();
    // Cell 6 is Label
    const label = $(cells[6]).text().trim();

    const stockIndex = stocks.findIndex(s => s.uniqueId === uniqueId);
    if (stockIndex !== -1) {
      if (stocks[stockIndex].section !== section || stocks[stockIndex].label !== label) {
        stocks[stockIndex].section = section;
        stocks[stockIndex].label = label;
        updatedCount++;
      }
    }
  }

  console.log(`\n\nUpdated section/label for ${updatedCount} items.`);
  fs.writeFileSync(stocksPath, JSON.stringify(stocks, null, 2));
  console.log('Done!');
}

updateSectionLabel();
