import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface BrowserFetchResult {
  html: string;
  contentHash: string;
  fetchedAt: Date;
  screenshotPath?: string;
  evidencePath?: string;
}

const RATE_LIMIT_MAP = new Map<string, number>();
const DEFAULT_DELAY_MS = 4000;

async function enforceRateLimit(domain: string, delayMs = DEFAULT_DELAY_MS) {
  const last = RATE_LIMIT_MAP.get(domain) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < delayMs) {
    await new Promise((r) => setTimeout(r, delayMs - elapsed));
  }
  RATE_LIMIT_MAP.set(domain, Date.now());
}

function slugUrl(url: string): string {
  return url
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 80);
}

export async function browserFetch(
  url: string,
  options: {
    delayMs?: number;
    waitForSelector?: string;
    waitForNetworkIdle?: boolean;
    takeScreenshot?: boolean;
  } = {}
): Promise<BrowserFetchResult> {
  // Import dinâmico para evitar quebrar em ambientes que não têm Playwright
  const { chromium } = await import("playwright");

  const domain = new URL(url).hostname;
  await enforceRateLimit(domain, options.delayMs ?? DEFAULT_DELAY_MS);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "pt-BR",
      viewport: { width: 1280, height: 900 },
      extraHTTPHeaders: {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const page = await context.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    // Usar domcontentloaded em vez de networkidle (sites com analytics nunca param)
    // Depois esperar manualmente pelo conteúdo dinâmico
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Aguardar o conteúdo dinâmico renderizar
    if (options.waitForNetworkIdle) {
      // Esperar até que não haja novas requisições de rede por 2s, com timeout de 15s
      try {
        await page.waitForLoadState("networkidle", { timeout: 15000 });
      } catch {
        // Se networkidle falhar, aguardar um tempo fixo para JS renderizar
        console.warn(`[BrowserFetch] networkidle timeout para ${url}, usando delay fixo`);
        await page.waitForTimeout(5000);
      }
    }

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 15000 }).catch(() => {
        console.warn(`Seletor "${options.waitForSelector}" não encontrado em ${url}`);
      });
    }

    // Scroll para baixo para forçar lazy-loading de cards
    await page.evaluate(async () => {
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await new Promise((r) => setTimeout(r, 800));
      }
      window.scrollTo(0, 0);
    });

    // Screenshot
    let screenshotPath: string | undefined;
    if (options.takeScreenshot !== false) {
      const screenshotDir = path.join(process.cwd(), "evidence", "screenshots");
      fs.mkdirSync(screenshotDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      screenshotPath = path.join(screenshotDir, `${slugUrl(url)}_${ts}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
    }

    const html = await page.content();
    const contentHash = crypto.createHash("md5").update(html).digest("hex");

    // Salvar HTML evidência
    const htmlDir = path.join(process.cwd(), "evidence", "html");
    fs.mkdirSync(htmlDir, { recursive: true });
    const ts2 = new Date().toISOString().replace(/[:.]/g, "-");
    const evidencePath = path.join(htmlDir, `${slugUrl(url)}_${ts2}.html`);
    fs.writeFileSync(evidencePath, html, "utf-8");

    return { html, contentHash, fetchedAt: new Date(), screenshotPath, evidencePath };
  } finally {
    await browser.close();
  }
}
