const fs = require('fs');
const path = require('path');
const google = require('googlethis');

const stocksPath = path.resolve(__dirname, 'data', 'stocks.json');
const stocks = JSON.parse(fs.readFileSync(stocksPath, 'utf8'));

// To prevent re-fetching if we rerun
let missingCount = stocks.filter(s => !s.img || s.img === '').length;
console.log(`Starting image fetch for ${missingCount} items without images...`);

// Delay helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchImages() {
  let updatedCount = 0;

  for (let i = 0; i < stocks.length; i++) {
    const stock = stocks[i];
    
    // Skip if it already has a valid image URL
    if (stock.img && stock.img.startsWith('http')) {
      continue;
    }

    try {
      // Create a search query based on item name and category for better context
      // e.g. "Arduino UNO electronics"
      let query = stock.itemName;
      if (stock.category && stock.category !== 'Essentials') {
        query += ' ' + stock.category;
      }
      query += ' product'; // help get product images

      const images = await google.image(query, { safe: false });
      
      if (images && images.length > 0) {
        // Pick the first valid image URL
        stock.img = images[0].url;
        updatedCount++;
        console.log(`[${i+1}/${stocks.length}] ✅ Found image for: ${stock.itemName}`);
      } else {
        console.log(`[${i+1}/${stocks.length}] ❌ No image found for: ${stock.itemName}`);
      }
    } catch (err) {
      console.log(`[${i+1}/${stocks.length}] ⚠️ Error fetching image for: ${stock.itemName} - ${err.message}`);
      // If we get blocked or rate limited, we might need to break or wait longer
      if (err.message.includes('429')) {
        console.log('Rate limited! Stopping for now.');
        break;
      }
    }

    // Save periodically just in case we crash or get blocked
    if (updatedCount % 10 === 0) {
      fs.writeFileSync(stocksPath, JSON.stringify(stocks, null, 2));
    }

    // Add a polite delay to avoid rate limits
    await delay(1500);
  }

  // Final save
  fs.writeFileSync(stocksPath, JSON.stringify(stocks, null, 2));
  console.log(`\nFinished! Successfully added images to ${updatedCount} items.`);
}

fetchImages().catch(console.error);
