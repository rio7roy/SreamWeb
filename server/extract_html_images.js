const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const axios = require('axios');

const htmlPath = 'C:/Users/maria/Downloads/HUB item/Copy of STREAM 2026.html';
const stocksPath = path.join(__dirname, 'data', 'stocks.json');
const uploadDir = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

async function extractAndDownload() {
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

    // Cell 7 is IMG (index 7 since 0-indexed)
    const imgTag = $(cells[7]).find('img');
    const src = imgTag.attr('src');

    if (src) {
      try {
        // We will sanitize uniqueId to be a valid filename
        const safeId = uniqueId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `item-${safeId}.jpg`;
        const filepath = path.join(uploadDir, filename);

        // Download the image
        const response = await axios({
          url: src,
          method: 'GET',
          responseType: 'stream'
        });

        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        // Find the item in stocks.json and update its image path
        const stockIndex = stocks.findIndex(s => s.uniqueId === uniqueId);
        if (stockIndex !== -1) {
          stocks[stockIndex].img = `/api/uploads/${filename}`;
          updatedCount++;
        }

        process.stdout.write(`\r✅ Downloaded and mapped: ${uniqueId} (${updatedCount})`);
      } catch (err) {
        console.error(`\n⚠️ Failed to download image for ${uniqueId}: ${err.message}`);
      }
    }
  }

  console.log(`\n\nSaving ${updatedCount} image mappings to stocks.json...`);
  fs.writeFileSync(stocksPath, JSON.stringify(stocks, null, 2));
  console.log('Done!');
}

extractAndDownload();
