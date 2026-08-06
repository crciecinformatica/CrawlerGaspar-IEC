import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface FetchResult {
  html: string;
  contentHash: string;
  fetchedAt: Date;
  statusCode: number;
  evidencePath?: string;
}

const RATE_LIMIT_MAP = new Map<string, number>(); // domain → last fetch timestamp
const DEFAULT_DELAY_MS = 3000;
const MAX_RETRIES = 3;

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function enforceRateLimit(domain: string, delayMs = DEFAULT_DELAY_MS) {
  const last = RATE_LIMIT_MAP.get(domain) ?? 0;
  const elapsed = Date.now() - last;
  if (elapsed < delayMs) {
    await new Promise((r) => setTimeout(r, delayMs - elapsed));
  }
  RATE_LIMIT_MAP.set(domain, Date.now());
}

function saveEvidence(html: string, url: string): string {
  const evidenceDir = path.join(process.cwd(), "evidence", "html");
  fs.mkdirSync(evidenceDir, { recursive: true });

  const slug = url
    .replace(/https?:\/\//, "")
    .replace(/[^a-z0-9]/gi, "_")
    .slice(0, 80);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(evidenceDir, `${slug}_${ts}.html`);
  fs.writeFileSync(filePath, html, "utf-8");
  return filePath;
}

export async function httpFetch(
  url: string,
  options: {
    delayMs?: number;
    saveHtml?: boolean;
    userAgent?: string;
  } = {}
): Promise<FetchResult> {
  const domain = getDomain(url);
  await enforceRateLimit(domain, options.delayMs ?? DEFAULT_DELAY_MS);

  const headers: Record<string, string> = {
    "User-Agent":
      options.userAgent ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers });
      const html = await res.text();
      const contentHash = crypto.createHash("md5").update(html).digest("hex");
      let evidencePath: string | undefined;

      if (options.saveHtml !== false) {
        evidencePath = saveEvidence(html, url);
      }

      return {
        html,
        contentHash,
        fetchedAt: new Date(),
        statusCode: res.status,
        evidencePath,
      };
    } catch (err) {
      lastError = err as Error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }

  throw lastError ?? new Error(`Falha ao buscar ${url}`);
}

export async function jsonFetch<T = unknown>(
  url: string,
  options: { delayMs?: number } = {}
): Promise<{ data: T; contentHash: string; fetchedAt: Date }> {
  const domain = getDomain(url);
  await enforceRateLimit(domain, options.delayMs ?? DEFAULT_DELAY_MS);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "IEC-Gaspar-Crawler/1.0",
    },
  });

  const json = await res.json();
  const raw = JSON.stringify(json);
  const contentHash = crypto.createHash("md5").update(raw).digest("hex");

  return { data: json as T, contentHash, fetchedAt: new Date() };
}
