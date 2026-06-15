const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('C:/Users/maria/Downloads/HUB item/Copy of STREAM 2026.html', 'utf8');
const $ = cheerio.load(html);
const rows = $('table tbody tr').toArray();
for(let i=0; i<5; i++) {
  const cells = $(rows[i]).find('td').toArray();
  if (cells.length < 9) continue;
  console.log(i, $(cells[1]).text().trim(), 'Sec:', $(cells[5]).text().trim(), 'Lab:', $(cells[6]).text().trim());
}
