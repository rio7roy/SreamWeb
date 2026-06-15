const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173/');
  await page.click('#portal-expert');
  await page.waitForSelector('#login-identifier');
  
  // Clear the identifier field
  await page.evaluate(() => document.querySelector('#login-identifier').value = '');
  await page.type('#login-identifier', '123rio');
  
  // Clear the password field
  await page.evaluate(() => document.querySelector('#login-password').value = '');
  await page.type('#login-password', '123rio');
  
  console.log("Submitting form...");
  await Promise.all([
    page.click('form button[type=\"submit\"]'),
    page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {})
  ]);
  
  console.log('Final URL:', page.url());
  
  // Wait a bit to catch any error logs
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
