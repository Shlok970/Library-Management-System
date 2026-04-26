import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    window.addEventListener('error', (event) => {
      console.error(`[Unhandled Error]: ${event.error?.stack || event.message}`);
    });
  });
  
  page.on('console', msg => {
    if(msg.type() === 'error' || msg.type() === 'warning')
      console.log(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[Browser Error]: ${err.toString()}`);
  });

  page.on('requestfailed', request => {
    console.log(`[Network Error]: ${request.url()} - ${request.failure()?.errorText}`);
  });

  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });
  
  // Fill login form
  await page.type('input[type="email"]', 'shloknagda11@gmail.com');
  await page.type('input[type="password"]', 'shlok_2006');
  await page.click('button[type="submit"]');

  try {
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
    console.log("Navigation timeout or no navigation occurred.");
  }
  
  await new Promise(r => setTimeout(r, 2000));

  const errorContent = await page.evaluate(() => {
    return window.__REACT_ERROR__ || null; // Just a placeholder if we want to catch.
  });

  const url = page.url();
  console.log(`[Current URL]: ${url}`);
  
  const content = await page.content();
  console.log(`\n[DOM Content Length]: ${content.length}`);
  
  if (content.length < 2000) {
    console.log("[Body Content]:");
    console.log(await page.$eval('body', el => el.innerHTML));
  } else {
    console.log("[Page rendered successfully with large DOM]");
  }

  await browser.close();
})();
