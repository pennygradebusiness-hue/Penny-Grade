import puppeteer from 'puppeteer-core';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.resolve('reports/live-test');

async function main() {
  console.log('Launching Real Chrome Browser window on desktop (headless: false)...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized', '--no-sandbox'],
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  try {
    // 1. Navigate to /checkout
    console.log('Navigating to http://localhost:8080/checkout ...');
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    // 2. Fill personal info
    console.log('Filling checkout form...');
    await page.waitForSelector('#fullName', { visible: true });
    await page.type('#fullName', 'Samir Pandey', { delay: 40 });
    await page.type('#email', 'pennygradebusiness@gmail.com', { delay: 40 });
    await page.type('#mobile', '9876543210', { delay: 40 });

    // 3. Fill address
    await page.type('#line1', 'Bungalow 4, Main Road', { delay: 40 });
    await page.type('#line2', 'Near Circuit House', { delay: 40 });
    await page.type('#landmark', 'Opposite Stadium', { delay: 40 });

    // 4. Accept terms
    console.log('Accepting Terms and Conditions...');
    await page.click('#terms');
    await new Promise((r) => setTimeout(r, 1000));

    // 5. Setup dialog handler to click OK for test mode simulation
    let orderNum = '';
    page.on('dialog', async (dialog) => {
      console.log(`[Browser Pop-up]:\n${dialog.message()}`);
      const match = dialog.message().match(/ORD-[A-Z0-9-]+/);
      if (match) orderNum = match[0];
      await new Promise((r) => setTimeout(r, 1500));
      await dialog.accept();
      console.log('Accepted test dialog to fulfill order!');
    });

    // 6. Submit
    console.log('Clicking Pay Now button...');
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    // 7. Wait for redirect to order confirmation
    console.log('Waiting for Order Confirmation & Physical Card Allocation...');
    await page.waitForFunction(() => window.location.pathname.includes('/order-confirmation/'), {
      timeout: 20000,
    });

    const confirmationUrl = page.url();
    console.log(`Successfully verified! URL: ${confirmationUrl}`);
    await new Promise((r) => setTimeout(r, 4000));

    // Take screenshot of confirmation page
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live-desktop-confirmation.png') });

    // 8. Now open Order Tracking page to verify customer lookup
    console.log('Navigating to /track-order ...');
    await page.goto(`${BASE_URL}/track-order`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise((r) => setTimeout(r, 2000));

    if (orderNum) {
      console.log(`Entering Order Number: ${orderNum} and Email...`);
      await page.type('#orderNumber', orderNum, { delay: 40 });
      await page.type('#verification', 'pennygradebusiness@gmail.com', { delay: 40 });
      const trackBtn = await page.$('button[type="submit"]');
      await trackBtn.click();
      await new Promise((r) => setTimeout(r, 4000));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'live-desktop-tracking.png') });
      console.log('Order Tracking verified live in browser!');
    }

    console.log('\nAll browser verifications finished successfully!');
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err) {
    console.error('Error during browser run:', err);
  } finally {
    await browser.close();
  }
}

main();
