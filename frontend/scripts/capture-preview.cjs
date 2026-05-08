const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

async function capture(baseUrl, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.getByTestId("teacher-login-username").fill("teacher");
  await page.getByTestId("teacher-login-password").fill("demo123");
  await page.getByTestId("teacher-login-submit").click();
  await page.waitForURL("**/files/library");
  await page.screenshot({ path: path.join(outDir, "teacher-files.png"), fullPage: true });

  await page.goto(`${baseUrl}/classes`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "teacher-classes.png"), fullPage: true });

  await page.goto(`${baseUrl}/settings`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "teacher-settings.png"), fullPage: true });

  await browser.close();
}

const baseUrl = process.argv[2] || "http://127.0.0.1:4174";
const outDir = process.argv[3] || path.resolve(__dirname, "..", "..", "tmp", "preview-capture");

capture(baseUrl, outDir).then(() => {
  process.stdout.write(`${outDir}\n`);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
