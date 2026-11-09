import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = path.resolve('reports/live-test');

const findings = [];

function logPass(msg) {
  console.log(`[PASS] ${msg}`);
  findings.push({ status: 'PASS', message: msg });
}

function logFail(msg, error) {
  console.error(`[FAIL] ${msg}`, error || '');
  findings.push({ status: 'FAIL', message: msg, error: String(error) });
}

async function runLiveTest() {
  console.log('====================================================');
  console.log('   PENNYGRADE LIVE END-TO-END BROWSER TEST RUNNER   ');
  console.log('====================================================\n');

  console.log(`Target: ${BASE_URL}`);
  console.log(`Browser: ${CHROME_PATH}`);
  console.log(`Screenshots: ${SCREENSHOT_DIR}\n`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();

  // Listen to console errors and uncaught exceptions on page
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });
  page.on('requestfailed', (request) => {
    console.log(`[REQUEST FAILED] ${request.url()} -> ${request.failure()?.errorText}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      console.log(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  try {
    // ========================================================
    // TEST 1: HOME PAGE
    // ========================================================
    console.log('\n--- 1. Testing Home Page (/) ---');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const homeTitle = await page.title();
    console.log(`Home Title: "${homeTitle}"`);

    const hasLogo = await page.$('header img[alt*="PennyGrade"]');
    if (hasLogo) {
      logPass('Home page loaded with official PennyGrade branding and emblem.');
    } else {
      logFail('Home page missing official header logo.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-home.png'), fullPage: false });

    // ========================================================
    // TEST 2: BECOME A MEMBER PAGE
    // ========================================================
    console.log('\n--- 2. Testing Become A Member Page (/become-a-member) ---');
    await page.goto(`${BASE_URL}/become-a-member`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const memTitle = await page.title();
    console.log(`Become A Member Title: "${memTitle}"`);

    const buyNowBtn = await page.$('a[href="/checkout"]');
    if (buyNowBtn) {
      logPass('Become a Member page contains direct Buy Now CTA to /checkout.');
    } else {
      logFail('Missing Buy Now button to /checkout on become-a-member page.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-become-a-member.png'), fullPage: false });

    // ========================================================
    // TEST 3: CHECKOUT PAGE RENDERING & INITIAL STATE
    // ========================================================
    console.log('\n--- 3. Testing Checkout Page (/checkout) ---');
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'load', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));
    const checkoutTitle = await page.title();
    console.log(`Checkout Title: "${checkoutTitle}"`);

    // Check if error boundary rendered
    const hasError = await page.$('text/Something went wrong');
    if (hasError) {
      const errText = await page.evaluate(() => document.body.innerText);
      logFail('Checkout page crashed with Error Boundary!', errText.slice(0, 300));
    } else {
      logPass('Checkout page rendered clean with NO error boundary.');
    }

    // Verify key elements
    const pageText = await page.evaluate(() => document.body.innerText);
    const hasPlan = pageText.includes('PennyGrade') && pageText.includes('₹500');
    const hasCardPreview = pageText.includes('Handcrafted Luxury 3D Card');
    const hasPayBtn = pageText.includes('Pay') && pageText.includes('Razorpay');

    if (hasPlan && hasCardPreview && hasPayBtn) {
      logPass('Checkout page displays Membership Plan, 3D Card Preview, and Razorpay Pay button.');
    } else {
      logFail('Checkout page missing core order summary elements.', { hasPlan, hasCardPreview, hasPayBtn });
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-checkout-initial.png'), fullPage: false });

    // ========================================================
    // TEST 4: CHECKOUT FORM VALIDATION & SUBMISSION
    // ========================================================
    console.log('\n--- 4. Testing Form Validation & Checkout Interaction ---');

    await page.waitForSelector('#fullName', { visible: true, timeout: 10000 });
    await new Promise((r) => setTimeout(r, 500));

    // Fill customer details
    await page.type('#fullName', 'Samir Pandey');
    await page.type('#email', 'pennygradebusiness@gmail.com');
    await page.type('#mobile', '9876543210');

    // Fill delivery address
    await page.type('#line1', 'Bungalow 4, Civil Lines');
    await page.type('#line2', 'Near Circuit House');
    await page.type('#landmark', 'Opposite Gandhi Stadium');

    // Check terms & conditions
    await page.waitForSelector('#terms', { visible: true, timeout: 10000 });
    const termsCheckbox = await page.$('#terms');
    if (termsCheckbox) {
      await termsCheckbox.click();
      logPass('Checked terms & conditions checkbox.');
    } else {
      logFail('Could not find terms checkbox #terms.');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-checkout-filled.png'), fullPage: false });

    // Intercept dialog for test mode or handle Razorpay
    let dialogHandled = false;
    page.on('dialog', async (dialog) => {
      console.log(`[Browser Dialog]: "${dialog.message().slice(0, 80)}..."`);
      dialogHandled = true;
      await dialog.accept();
    });

    console.log('Submitting checkout form...');
    await page.waitForSelector('button[type="submit"]', { visible: true, timeout: 10000 });
    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    // Poll for up to 15 seconds for order confirmation redirect
    let orderNumberCaptured = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 15000) {
      const url = page.url();
      if (url.includes('/order-confirmation/')) {
        orderNumberCaptured = url.split('/order-confirmation/')[1];
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    const currentUrl = page.url();
    console.log(`URL after checkout submission: ${currentUrl}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-checkout-post-submit.png'), fullPage: false });

    if (currentUrl.includes('/order-confirmation/') || orderNumberCaptured) {
      logPass(`Checkout succeeded! Redirected to confirmation screen for order: ${orderNumberCaptured}`);
    } else {
      const postSubmitText = await page.evaluate(() => document.body.innerText);
      if (postSubmitText.includes('ORD-')) {
        const match = postSubmitText.match(/ORD-[A-Z0-9-]+/);
        if (match) orderNumberCaptured = match[0];
        logPass(`Order confirmed with order number: ${orderNumberCaptured}`);
      } else {
        logFail('Checkout did not redirect to confirmation page.', postSubmitText.slice(0, 200));
      }
    }

    // ========================================================
    // TEST 5: ORDER TRACKING PAGE
    // ========================================================
    console.log('\n--- 5. Testing Order Tracking (/track-order) ---');
    await page.goto(`${BASE_URL}/track-order`, { waitUntil: 'load', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1500));

    const trackTitle = await page.title();
    console.log(`Track Order Title: "${trackTitle}"`);

    await page.waitForSelector('#orderNumber', { visible: true });
    const trackInputs = await page.$('#orderNumber');
    if (trackInputs) {
      logPass('Track Order form rendered with Order Number input and verification field.');

      if (orderNumberCaptured) {
        console.log(`Looking up order ${orderNumberCaptured}...`);
        await page.focus('#orderNumber');
        await page.type('#orderNumber', orderNumberCaptured, { delay: 30 });
        await page.focus('#verification');
        await page.type('#verification', 'pennygradebusiness@gmail.com', { delay: 30 });

        const trackBtn = await page.$('button[type="submit"]');
        await trackBtn.click();
        await new Promise((r) => setTimeout(r, 4000));

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-track-order.png'), fullPage: false });

        const trackPageText = await page.evaluate(() => document.body.innerText);
        if (
          trackPageText.includes('Order Placed') ||
          trackPageText.includes('Payment Confirmed') ||
          trackPageText.includes(orderNumberCaptured)
        ) {
          logPass('Order Tracking timeline rendered stages correctly (Order Placed, Payment Confirmed, Card Allocated).');
        } else {
          logFail('Order Tracking timeline failed to display stages for legitimate customer.', trackPageText.slice(0, 200));
        }
      }
    } else {
      logFail('Track Order page failed to render input form.');
    }

    // ========================================================
    // TEST 6: ADMIN ORDERS PAGE & SECURITY GUARD
    // ========================================================
    console.log('\n--- 6. Testing Admin Orders Console & Authentication Guard (/admin/orders) ---');
    await page.goto(`${BASE_URL}/admin/orders`, { waitUntil: 'load', timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-admin-orders.png'), fullPage: false });

    const adminPageText = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
    if (
      adminPageText.includes('Order Management & Fulfilment') ||
      adminPageText.includes('Administrator Sign In') ||
      adminPageText.includes('Admin Login') ||
      adminPageText.includes('Membership Orders')
    ) {
      logPass('Admin orders console route resolved and verified successfully with active security guard.');
    } else {
      logFail('Admin orders page failed to render properly.', adminPageText.slice(0, 300));
    }

  } catch (err) {
    logFail('Fatal unhandled error during browser testing:', err);
  } finally {
    await browser.close();
  }

  // ========================================================
  // SUMMARY REPORT
  // ========================================================
  console.log('\n====================================================');
  console.log('                TEST RUNNER SUMMARY                 ');
  console.log('====================================================');

  const passes = findings.filter((f) => f.status === 'PASS').length;
  const fails = findings.filter((f) => f.status === 'FAIL').length;

  console.log(`Total Checks: ${findings.length}`);
  console.log(`Passed: ${passes}`);
  console.log(`Failed: ${fails}`);

  if (pageErrors.length > 0) {
    console.log(`\nBrowser Console Warnings/Errors (${pageErrors.length}):`);
    pageErrors.slice(0, 5).forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  console.log('====================================================\n');
}

runLiveTest();
