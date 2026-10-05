import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "vite";
const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
let playwright;
if (process.env.PLAYWRIGHT_MODULE) {
  playwright = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
} else {
  const cache = join(homedir(), ".npm", "_npx");
  for (const entry of await readdir(cache)) {
    try {
      playwright = await import(
        pathToFileURL(join(cache, entry, "node_modules/playwright/index.mjs"))
      );
      break;
    } catch {}
  }
}
if (!playwright) {
  throw new Error(
    "Installed Playwright MCP package could not be found. Set PLAYWRIGHT_MODULE to its index.mjs path.",
  );
}
await mkdir("artifacts", { recursive: true });
let server, browser;
const url = process.env.APP_URL || "http://localhost:5173/";
try {
  let available = false;
  try {
    available = (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok;
  } catch {}
  if (!available) {
    server = await createServer({
      server: { host: "0.0.0.0", port: 5173, strictPort: true },
    });
    await server.listen();
  }
  browser = await playwright.chromium.launch({
    executablePath: process.env.BROWSER_PATH || "/opt/brave-origin-bin/brave",
    headless: true,
    args: ["--enable-unsafe-swiftshader", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const messages = [], network = [];
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) {
      messages.push({ type: msg.type(), text: msg.text() });
    }
  });
  page.on(
    "requestfailed",
    (request) =>
      network.push({ url: request.url(), error: request.failure()?.errorText }),
  );
  const run = async (file) => {
    const source = (await readFile(file, "utf8")).replaceAll(
      "http://localhost:5173/",
      url,
    );
    return await (0, eval)(source.replace(/;\s*$/, ""))(page);
  };
  const result = {};
  try {
    if (process.env.WARNING_DIAGNOSTICS === "1") {
      result.warnings = await run("tests/warnings.flow.js");
    }
    result.journey = await run("tests/iphone12.flow.js");
    result.motion = await run("tests/motion.flow.js");
    const cdp = await context.newCDPSession(page);
    await cdp.send("Performance.enable");
    result.performance = await cdp.send("Performance.getMetrics");
    result.rendering = await page.evaluate(() => window.__cosmosMetrics);
    result.status = "PASSED";
  } catch (error) {
    result.status = "FAILED";
    result.error = error.stack;
    await page.screenshot({ path: "artifacts/failure.png" });
    throw error;
  } finally {
    result.console = messages;
    result.network = network;
    await writeFile(
      "artifacts/browser-report.json",
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify(
        {
          status: result.status,
          error: result.error,
          rendering: result.rendering,
          report: "artifacts/browser-report.json",
        },
        null,
        2,
      ),
    );
  }
} finally {
  await browser?.close();
  await server?.close();
}
