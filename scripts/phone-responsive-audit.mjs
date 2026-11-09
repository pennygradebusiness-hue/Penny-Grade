import puppeteer from "puppeteer-core";
import fs from "node:fs/promises";
import path from "node:path";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

const viewports = [
  320, 340, 360, 375, 390, 393, 414, 430, 440, 480, 514, 540, 600, 639, 640, 674, 768, 820, 1023,
  1024, 1280, 1440,
];
const results = [];
const screenshotDir = path.resolve("artifacts/local-qa/phone-responsive");
await fs.mkdir(screenshotDir, { recursive: true });

try {
  for (const width of viewports) {
    await page.setViewport({ width, height: 844, deviceScaleFactor: 1, isMobile: false });
    await page.goto("http://localhost:8080/", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForSelector("main .grid.grid-cols-2.gap-3.rounded-2xl", { timeout: 15000 });
    if ([320, 375, 390, 414, 430, 480, 514, 640, 674, 768, 1024, 1440].includes(width)) {
      await page.screenshot({ path: path.join(screenshotDir, `home-${width}.png`) });
    }
    results.push(
      await page.evaluate(() => {
        const bar = [...document.querySelectorAll("div.fixed")].find((element) =>
          element.textContent?.includes("Buy PennyGrade Card"),
        );
        const rect = bar?.getBoundingClientRect();
        return {
          width: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          stickyBarVisible: Boolean(rect && rect.width > 0 && rect.height > 0),
          stickyBarBottomGap: rect ? Math.round(window.innerHeight - rect.bottom) : null,
          stickyBarHeight: rect ? Math.round(rect.height) : null,
          statGridWidth: Math.round(
            document
              .querySelector("main .grid.grid-cols-2.gap-3.rounded-2xl")
              ?.getBoundingClientRect().width || 0,
          ),
          statGridColumns: getComputedStyle(
            document.querySelector("main .grid.grid-cols-2.gap-3.rounded-2xl"),
          ).gridTemplateColumns.split(" ").length,
          statContentOverflow: [
            ...document.querySelectorAll("main .grid.grid-cols-2.gap-3.rounded-2xl > div > div"),
          ].some((element) => element.scrollWidth > element.clientWidth + 1),
          heroVisible: Boolean(
            document.querySelector(".mobile-home h1")?.getBoundingClientRect().width,
          ),
          businessesVisible: Boolean(
            document.querySelector(".mobile-home section:nth-of-type(3) a[href='/partners']"),
          ),
        };
      }),
    );
  }
  console.log(JSON.stringify({ results, browserErrors: errors }, null, 2));
} finally {
  await browser.close();
}
