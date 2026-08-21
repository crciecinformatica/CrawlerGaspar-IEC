import { PlaywrightCrawlingContext } from "@crawlee/playwright";
import * as cheerio from "cheerio";
import { RawCourseOffer } from "./extractors/base";

// ──────────────────────────────────────────────
// UTILIDADES GLOBAIS DE EXTRAÇÃO DE PREÇO
// ──────────────────────────────────────────────

const PRICE_REGEX = /R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi;
const INSTALLMENT_REGEX = /(\d+)\s*[xX×]\s*(?:de\s*)?R\$\s*([\d.,]+)/i;

export function extractPricesFromText(text: string): {
  priceRaw?: string;
  discountPriceRaw?: string;
  installmentsRaw?: string;
  campaignName?: string;
} {
  if (!text) return {};

  const allPrices = text.match(PRICE_REGEX) || [];
  const installmentMatch = text.match(INSTALLMENT_REGEX);

  let priceRaw: string | undefined;
  let discountPriceRaw: string | undefined;
  let installmentsRaw: string | undefined;
  let campaignName: string | undefined;

  if (installmentMatch) {
    installmentsRaw = installmentMatch[0];
  }

  const deForPattern = text.match(/[Dd]e\s+(R\$\s*[\d.,]+)\s*(?:por|→|>)\s*(R\$\s*[\d.,]+)/);
  if (deForPattern) {
    priceRaw = deForPattern[1];
    discountPriceRaw = deForPattern[2];
  } else if (allPrices.length >= 2 && !installmentMatch) {
    const parsed = allPrices.map((p) => ({
      raw: p,
      value: parseFloat(p.replace(/[^\d,]/g, "").replace(",", ".")),
    }));
    parsed.sort((a, b) => b.value - a.value);
    priceRaw = parsed[0].raw;
    if (parsed[1].value < parsed[0].value) {
      discountPriceRaw = parsed[1].raw;
    }
  } else if (allPrices.length === 1 && !installmentMatch) {
    priceRaw = allPrices[0];
  } else if (allPrices.length >= 1 && installmentMatch) {
    const nonInstallment = allPrices.filter((p) => !installmentMatch[0].includes(p));
    if (nonInstallment.length >= 2) {
      const parsed = nonInstallment.map((p) => ({
        raw: p,
        value: parseFloat(p.replace(/[^\d,]/g, "").replace(",", ".")),
      }));
      parsed.sort((a, b) => b.value - a.value);
      priceRaw = parsed[0].raw;
      discountPriceRaw = parsed[1].raw;
    } else if (nonInstallment.length === 1) {
      priceRaw = nonInstallment[0];
    }
  }

  const cupomMatch = text.match(/(?:cupom|código|voucher)\s+([A-Z0-9]{4,20})/i);
  if (cupomMatch) {
    campaignName = cupomMatch[1];
  }
  const campaignPatterns = /(combo\s*\d?\s*em\s*\d|black\s*friday|volta\s*[àa]s\s*aulas|matrícula\s*antecipada|desconto\s*\w+)/i;
  const campaignMatch = text.match(campaignPatterns);
  if (campaignMatch && !campaignName) {
    campaignName = campaignMatch[1].trim();
  }

  return { priceRaw, discountPriceRaw, installmentsRaw, campaignName };
}

export function detectModalityFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/(100%\s*online|ead|a\s*distância|digital|aulas\s*online)/.test(lower)) return "EAD";
  if (/(presencial|campus|sede)/.test(lower)) return "PRESENCIAL";
  if (/(híbrido|semipresencial|flex)/.test(lower)) return "HIBRIDO";
  return undefined;
}

// ──────────────────────────────────────────────
// HANDLERS PARA CADA CONCORRENTE
// ──────────────────────────────────────────────

export async function handleDescomplica({ page, request, log, pushData }: PlaywrightCrawlingContext) {
  log.info(`[Descomplica] Extraindo: ${request.url}`);
  
  // Force scroll down to trigger lazy loading
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise((r) => setTimeout(r, 800));
    }
    window.scrollTo(0, 0);
  });
  
  // Wait a little bit for lazy loaded content
  await page.waitForTimeout(2000);

  const html = await page.content();
  const $ = cheerio.load(html);
  const seenTitles = new Set<string>();

  const courseCardContainers: any[] = [];
  $("section, div").each((_, el) => {
    const $el = $(el);
    const hasTitle = $el.find("h3").length > 0;
    const hasPrice = PRICE_REGEX.test($el.text());
    const hasLink = $el.find("a[href*='checkout'], a[href*='matricular'], a[href*='/pos-graduacao/']").length > 0;

    if (hasTitle && (hasPrice || hasLink)) {
      const textLen = $el.text().length;
      if (textLen > 50 && textLen < 5000) {
        courseCardContainers.push($el);
      }
    }
  });

  const filteredCards = courseCardContainers.filter(($el) => {
    const childCards = courseCardContainers.filter(
      ($other) => $other !== $el && $.contains($el[0], $other[0])
    );
    return childCards.length === 0;
  });

  for (const $card of filteredCards) {
    const title = $card.find("h3").first().text().trim();
    if (!title || title.length < 5 || seenTitles.has(title)) continue;
    seenTitles.add(title);

    const cardText = $card.text();
    const prices = extractPricesFromText(cardText);

    const href = $card.find("a[href*='/pos-graduacao/']").not("[href*='#']").first().attr("href");
    const coursePageUrl = href ? new URL(href, request.url).href : undefined;
    const modality = detectModalityFromText(cardText) ?? "EAD";

    const offer: RawCourseOffer = {
      title,
      modality,
      priceRaw: prices.priceRaw,
      discountPriceRaw: prices.discountPriceRaw,
      installmentsRaw: prices.installmentsRaw,
      campaignName: prices.campaignName,
      sourceUrl: request.url,
      coursePageUrl,
      confidenceScore: prices.priceRaw || prices.installmentsRaw ? 0.85 : 0.5,
    };
    await pushData(offer);
  }

  // Fallback
  if (seenTitles.size === 0) {
    log.warning("[Descomplica] Nenhum card com preço encontrado, usando fallback de links");
    const pageText = $("body").text();
    const globalPrices = extractPricesFromText(pageText);

    $("a[href*='/pos-graduacao/']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text.length > 10 && text.length < 200 && href && !href.includes("#")) {
        if (seenTitles.has(text)) return;
        seenTitles.add(text);
        const offer: RawCourseOffer = {
          title: text,
          modality: "EAD",
          priceRaw: globalPrices.priceRaw,
          installmentsRaw: globalPrices.installmentsRaw,
          campaignName: globalPrices.campaignName,
          sourceUrl: request.url,
          coursePageUrl: new URL(href, request.url).href,
          confidenceScore: 0.4,
        };
        pushData(offer);
      }
    });
  }
}

export async function handlePucrs({ page, request, log, pushData }: PlaywrightCrawlingContext) {
  log.info(`[PUCRS] Extraindo: ${request.url}`);
  
  await page.waitForTimeout(4000); // Allow content to settle and prices to load from API

  const html = await page.content();
  const $ = cheerio.load(html);
  const seenTitles = new Set<string>();

  const headerText = $("header, [class*='banner'], [class*='hero']").text();
  const globalPrices = extractPricesFromText(headerText + " " + $("body").text().slice(0, 2000));

  const courseCardContainers: any[] = [];
  $("article, section, div, li").each((_, el) => {
    const $el = $(el);
    const hasTitle = $el.find("h2, h3, h4, [class*='title'], [class*='nome']").length > 0;
    const hasLink = $el.find("a[href*='/cursos/'], a[href*='/pos-graduacao/']").length > 0;
    if (hasTitle && hasLink) {
      const textLen = $el.text().length;
      if (textLen > 20 && textLen < 5000) {
        courseCardContainers.push($el);
      }
    }
  });

  const filteredCards = courseCardContainers.filter(($el) => {
    const childCards = courseCardContainers.filter(
      ($other) => $other !== $el && $.contains($el[0], $other[0])
    );
    return childCards.length === 0;
  });

  for (const $card of filteredCards) {
    const title = $card.find("h2, h3, h4, [class*='title'], [class*='nome']").first().text().trim();
    if (!title || title.length < 10 || title.includes("chevron_right") || title.toLowerCase() === "matricule-se") continue;
    if (seenTitles.has(title)) continue;
    
    seenTitles.add(title);
    
    let priceRaw = $card.find("[class*='price'], [class*='preco'], [class*='valor']").first().text().trim();
    const cardText = $card.text();
    const prices = !priceRaw ? extractPricesFromText(cardText) : { priceRaw, discountPriceRaw: undefined, installmentsRaw: undefined, campaignName: undefined };

    const modality = detectModalityFromText(cardText) || "EAD";
    const href = $card.find("a[href*='/cursos/'], a[href*='/pos-graduacao/']").not("[href*='#']").first().attr("href");

    const offer: RawCourseOffer = {
      title,
      modality,
      priceRaw: prices.priceRaw || globalPrices.priceRaw,
      discountPriceRaw: prices.discountPriceRaw,
      installmentsRaw: prices.installmentsRaw || globalPrices.installmentsRaw,
      campaignName: prices.campaignName || globalPrices.campaignName,
      sourceUrl: request.url,
      coursePageUrl: href ? new URL(href, request.url).href : undefined,
      confidenceScore: prices.priceRaw || globalPrices.priceRaw ? 0.7 : 0.45,
    };
    await pushData(offer);
  }
}

export async function handlePucpr({ page, request, log, pushData, enqueueLinks }: PlaywrightCrawlingContext) {
  if (request.userData?.label === 'DETAIL') {
    log.info(`[PUCPR Deep Crawl] Extraindo detalhes de: ${request.url}`);
    await page.waitForTimeout(4000); // Aguarda carregamento de scripts/iframes
    
    // Extrai texto de todos os frames (PUCPR usa iframes para preços)
    let fullText = "";
    for (const frame of page.frames()) {
      try {
        const html = await frame.content();
        const $ = cheerio.load(html);
        fullText += " " + $("body").text();
      } catch (e) {
        // ignora cross-origin frames se não puder ler
      }
    }
    
    const prices = extractPricesFromText(fullText);

    const offer: RawCourseOffer = request.userData.offer;
    
    if (prices.priceRaw) {
      offer.priceRaw = prices.priceRaw;
      offer.discountPriceRaw = prices.discountPriceRaw;
      offer.installmentsRaw = prices.installmentsRaw;
      if (prices.campaignName) offer.campaignName = prices.campaignName;
      offer.confidenceScore = 0.8;
      log.info(`[PUCPR Deep Crawl] Preço encontrado: ${prices.priceRaw}`);
    } else {
      log.warning(`[PUCPR Deep Crawl] Preço não encontrado em ${request.url}`);
    }

    await pushData(offer);
    return;
  }

  log.info(`[PUCPR] Extraindo lista: ${request.url}`);
  
  try {
    await page.waitForSelector("a, article, [class*='course']", { timeout: 15000 });
    await page.waitForTimeout(3000); // Aguarda mais um pouco para injetar o preço na DOM
  } catch (e) {
    log.warning(`[PUCPR] Selector timeout no wait for a, article, course classes.`);
  }

  const html = await page.content();
  const $ = cheerio.load(html);
  const seenTitles = new Set<string>();

  const pageText = $("body").text().slice(0, 5000);
  const globalPrices = extractPricesFromText(pageText);

  const cardSelectors = ["article", ".course-card", "[class*='CardCurso']", "[class*='course']", "li.item"];
  let cards = $("");
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 2) {
      cards = found;
      break;
    }
  }

  const detailUrlsToQueue: { url: string; offer: RawCourseOffer }[] = [];

  if (cards.length === 0) {
    $("a[href*='/pos-graduacao/'], a[href*='/curso/'], a[href*='/mba']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text.length > 10 && text.length < 200 && href && !seenTitles.has(text)) {
        seenTitles.add(text);
        const parentText = $(el).parent().text() + " " + $(el).parent().parent().text();
        const prices = extractPricesFromText(parentText);
        const coursePageUrl = new URL(href, request.url).href;

        const offer: RawCourseOffer = {
          title: text,
          modality: "EAD",
          priceRaw: prices.priceRaw || globalPrices.priceRaw,
          installmentsRaw: prices.installmentsRaw || globalPrices.installmentsRaw,
          sourceUrl: request.url,
          coursePageUrl,
          confidenceScore: prices.priceRaw ? 0.6 : 0.35,
        };
        
        if (!offer.priceRaw && coursePageUrl) {
          detailUrlsToQueue.push({ url: coursePageUrl, offer });
        } else {
          pushData(offer);
        }
      }
    });
  } else {
    cards.each((_, el) => {
      const $card = $(el);
      const title = $card.find("h2, h3, h4, [class*='title']").first().text().trim();
      if (!title || title.length < 5 || seenTitles.has(title)) return;
      seenTitles.add(title);

      let priceRaw = $card.find("[class*='preco'], [class*='price'], [class*='valor']").first().text().trim();
      const cardText = $card.text();
      const prices = !priceRaw ? extractPricesFromText(cardText) : { priceRaw };

      const modality = $card.find("[class*='modalidade']").first().text().trim() || detectModalityFromText(cardText) || "EAD";
      const href = $card.attr("href") || $card.find("a").first().attr("href");
      const coursePageUrl = href ? new URL(href, request.url).href : undefined;

      const offer: RawCourseOffer = {
        title,
        modality,
        priceRaw: prices.priceRaw || undefined,
        discountPriceRaw: prices.discountPriceRaw,
        installmentsRaw: prices.installmentsRaw,
        sourceUrl: request.url,
        coursePageUrl,
        confidenceScore: prices.priceRaw ? 0.7 : 0.45,
      };

      if (!prices.priceRaw && coursePageUrl) {
        detailUrlsToQueue.push({ url: coursePageUrl, offer });
      } else {
        pushData(offer);
      }
    });
  }

  // Enqueue detail pages (limited to avoid too many requests)
  const toQueue = detailUrlsToQueue.slice(0, 20);
  if (toQueue.length > 0) {
    log.info(`[PUCPR] Fila de Deep Crawl: ${toQueue.length} cursos sem preço na lista.`);
    await enqueueLinks({
      urls: toQueue.map((item) => item.url),
      transformRequestFunction(req) {
        const item = toQueue.find(i => i.url === req.url);
        req.userData = { label: 'DETAIL', offer: item?.offer };
        return req;
      },
    });
  }
}

export async function handleFgv({ page, request, log, pushData, enqueueLinks }: PlaywrightCrawlingContext) {
  if (request.userData?.label === 'DETAIL') {
    log.info(`[FGV Deep Crawl] Extraindo detalhes de: ${request.url}`);
    await page.waitForTimeout(4000);
    
    let fullText = "";
    for (const frame of page.frames()) {
      try {
        const html = await frame.content();
        const $ = cheerio.load(html);
        fullText += " " + $("body").text();
      } catch (e) {}
    }
    
    const prices = extractPricesFromText(fullText);

    const offer: RawCourseOffer = request.userData.offer;
    
    if (prices.priceRaw) {
      offer.priceRaw = prices.priceRaw;
      offer.discountPriceRaw = prices.discountPriceRaw;
      offer.installmentsRaw = prices.installmentsRaw;
      if (prices.campaignName) offer.campaignName = prices.campaignName;
      offer.confidenceScore = 0.8;
      log.info(`[FGV Deep Crawl] Preço encontrado: ${prices.priceRaw}`);
    } else {
      log.warning(`[FGV Deep Crawl] Preço não encontrado em ${request.url}`);
    }

    await pushData(offer);
    return;
  }

  log.info(`[FGV] Extraindo lista: ${request.url}`);
  await page.waitForTimeout(3000); // Give FGV some time to load

  const html = await page.content();
  const $ = cheerio.load(html);
  const seenTitles = new Set<string>();

  const cardSelectors = [".views-row", "article", ".view-content > div", "[class*='course']", "[class*='programa']"];
  let cards = $("");
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 2) {
      cards = found;
      break;
    }
  }

  const detailUrlsToQueue: { url: string; offer: RawCourseOffer }[] = [];

  if (cards.length === 0) {
    $("a[href*='/cursos/'], a[href*='/programas/'], a[href*='/pos-graduacao/']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text.length > 10 && href && !seenTitles.has(text)) {
        seenTitles.add(text);
        const parentText = $(el).parent().text() + " " + $(el).parent().parent().text();
        const prices = extractPricesFromText(parentText);
        const coursePageUrl = new URL(href, request.url).href;

        const offer: RawCourseOffer = {
          title: text,
          priceRaw: prices.priceRaw,
          installmentsRaw: prices.installmentsRaw,
          sourceUrl: request.url,
          coursePageUrl,
          confidenceScore: prices.priceRaw ? 0.5 : 0.3,
        };
        
        if (!prices.priceRaw) {
          detailUrlsToQueue.push({ url: coursePageUrl, offer });
        } else {
          pushData(offer);
        }
      }
    });
  } else {
    cards.each((_, el) => {
      const $card = $(el);
      const title = $card.find("h2, h3, h4, .field-title, [class*='title']").first().text().trim();
      if (!title || title.length < 5 || seenTitles.has(title)) return;
      seenTitles.add(title);

      let priceRaw = $card.find("[class*='price'], [class*='valor'], [class*='invest']").first().text().trim();
      const cardText = $card.text();
      const prices = !priceRaw ? extractPricesFromText(cardText) : { priceRaw };

      const modality = $card.find("[class*='modalidade'], .field-modalidade").first().text().trim() || detectModalityFromText(cardText);
      const href = $card.attr("href") || $card.find("a[href]").first().attr("href");
      const coursePageUrl = href ? new URL(href, request.url).href : undefined;

      const offer: RawCourseOffer = {
        title,
        modality: modality || undefined,
        priceRaw: prices.priceRaw || undefined,
        discountPriceRaw: prices.discountPriceRaw,
        installmentsRaw: prices.installmentsRaw,
        sourceUrl: request.url,
        coursePageUrl,
        confidenceScore: prices.priceRaw ? 0.7 : 0.45,
      };

      if (!prices.priceRaw && coursePageUrl) {
        detailUrlsToQueue.push({ url: coursePageUrl, offer });
      } else {
        pushData(offer);
      }
    });
  }

  // Enqueue detail pages (limited to avoid too many requests)
  const toQueue = detailUrlsToQueue.slice(0, 20);
  if (toQueue.length > 0) {
    log.info(`[FGV] Fila de Deep Crawl: ${toQueue.length} cursos sem preço na lista.`);
    await enqueueLinks({
      urls: toQueue.map((item) => item.url),
      transformRequestFunction(req) {
        const item = toQueue.find(i => i.url === req.url);
        req.userData = { label: 'DETAIL', offer: item?.offer };
        return req;
      },
    });
  }
}
