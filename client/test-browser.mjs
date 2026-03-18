import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:5173/dashboard');
  
  // wait 5 seconds to let react crash
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
