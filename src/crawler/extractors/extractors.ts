import * as cheerio from "cheerio";
import { RawCourseOffer } from "./base";
import { httpFetch } from "../http-fetcher";
import { browserFetch } from "../browser-fetcher";

// ──────────────────────────────────────────────
// UTILIDADES GLOBAIS DE EXTRAÇÃO DE PREÇO
// ──────────────────────────────────────────────

/** Regex global para encontrar valores monetários brasileiros no texto */
const PRICE_REGEX = /R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/gi;

/** Regex para parcelas: "18x R$ 79,90" ou "12x de R$ 150,00" */
const INSTALLMENT_REGEX = /(\d+)\s*[xX×]\s*(?:de\s*)?R\$\s*([\d.,]+)/i;

/**
 * Extrai TODOS os preços (R$ X.XXX,XX) do texto de um elemento.
 * Retorna um objeto com priceRaw (primeiro valor ou valor riscado),
 * discountPriceRaw (preço com desconto se houver),
 * installmentsRaw (parcela se houver).
 */
function extractPricesFromText(text: string): {
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

  // Detectar parcelas
  if (installmentMatch) {
    installmentsRaw = installmentMatch[0];
  }

  // Detectar padrão "De R$ X por R$ Y" (preço riscado + desconto)
  const deForPattern = text.match(
    /[Dd]e\s+(R\$\s*[\d.,]+)\s*(?:por|→|>)\s*(R\$\s*[\d.,]+)/
  );
  if (deForPattern) {
    priceRaw = deForPattern[1];        // preço cheio (riscado)
    discountPriceRaw = deForPattern[2]; // preço com desconto
  } else if (allPrices.length >= 2 && !installmentMatch) {
    // Se temos 2+ preços sem padrão "de/por", o maior é o cheio e o menor é o desconto
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
    // Temos preços e parcelas — filtrar o que não é a parcela
    const nonInstallment = allPrices.filter(
      (p) => !installmentMatch[0].includes(p)
    );
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

  // Detectar cupom/campanha
  const cupomMatch = text.match(
    /(?:cupom|código|voucher)\s+([A-Z0-9]{4,20})/i
  );
  if (cupomMatch) {
    campaignName = cupomMatch[1];
  }
  // Ou detectar campanha por padrão "combo", "promoção", "black friday"
  const campaignPatterns = /(combo\s*\d?\s*em\s*\d|black\s*friday|volta\s*[àa]s\s*aulas|matrícula\s*antecipada|desconto\s*\w+)/i;
  const campaignMatch = text.match(campaignPatterns);
  if (campaignMatch && !campaignName) {
    campaignName = campaignMatch[1].trim();
  }

  return { priceRaw, discountPriceRaw, installmentsRaw, campaignName };
}

/**
 * Detecta modalidade a partir do texto do card quando não há classe semântica
 */
function detectModalityFromText(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/(100%\s*online|ead|a\s*distância|digital|aulas\s*online)/.test(lower)) return "EAD";
  if (/(presencial|campus|sede)/.test(lower)) return "PRESENCIAL";
  if (/(híbrido|semipresencial|flex)/.test(lower)) return "HIBRIDO";
  return undefined;
}

// ──────────────────────────────────────────────
// DESCOMPLICA
// Cards com classes ofuscadas tipo sc-cf119afe-*
// Preços visíveis: "De R$ 2.967,30 por R$ 1.438,20 à vista ou 18x R$79,90"
// ──────────────────────────────────────────────
const DESCOMPLICA_URL = "https://descomplica.com.br/pos-graduacao/";

export async function extractDescomplica(
  url = DESCOMPLICA_URL
): Promise<RawCourseOffer[]> {
  console.log("[Descomplica] Iniciando extração via browser...");
  const { html } = await browserFetch(url, {
    waitForNetworkIdle: true,
    takeScreenshot: true,
  });

  const $ = cheerio.load(html);
  const offers: RawCourseOffer[] = [];
  const seenTitles = new Set<string>();

  // Estratégia 1: Buscar sections/divs que contenham um h3 E um link para curso
  // Os cards reais da Descomplica geralmente são <section> com h3 + preço + botão matricular
  const courseCardContainers: any[] = [];

  $("section, div").each((_, el) => {
    const $el = $(el);
    const hasTitle = $el.find("h3").length > 0;
    const hasPrice = PRICE_REGEX.test($el.text());
    const hasLink = $el.find("a[href*='checkout'], a[href*='matricular'], a[href*='/pos-graduacao/']").length > 0;

    // Um card de curso deve ter título + (preço OU link de matrícula)
    if (hasTitle && (hasPrice || hasLink)) {
      // Verificar se não é um container enorme (a página inteira)
      const textLen = $el.text().length;
      if (textLen > 50 && textLen < 5000) {
        courseCardContainers.push($el);
      }
    }
  });

  console.log(`[Descomplica] ${courseCardContainers.length} potenciais cards encontrados via heurística`);

  // Filtrar: pegar apenas os cards mais internos (que não contêm outros cards)
  const filteredCards = courseCardContainers.filter(($el) => {
    const childCards = courseCardContainers.filter(
      ($other) => $other !== $el && $.contains($el[0], $other[0])
    );
    return childCards.length === 0; // Sem filhos que também são cards
  });

  console.log(`[Descomplica] ${filteredCards.length} cards após filtragem de aninhamento`);

  for (const $card of filteredCards) {
    const title = $card.find("h3").first().text().trim();
    if (!title || title.length < 5 || seenTitles.has(title)) continue;
    seenTitles.add(title);

    const cardText = $card.text();
    const prices = extractPricesFromText(cardText);

    const href = $card.find("a[href*='/pos-graduacao/']").not("[href*='#']").first().attr("href");
    const coursePageUrl = href ? new URL(href, url).href : undefined;

    const modality = detectModalityFromText(cardText) ?? "EAD"; // Descomplica é 100% EAD

    offers.push({
      title,
      modality,
      priceRaw: prices.priceRaw,
      discountPriceRaw: prices.discountPriceRaw,
      installmentsRaw: prices.installmentsRaw,
      campaignName: prices.campaignName,
      sourceUrl: url,
      coursePageUrl,
      confidenceScore: prices.priceRaw || prices.installmentsRaw ? 0.85 : 0.5,
    });
  }

  // Fallback: se nenhum card com preço encontrado, usar links
  if (offers.length === 0) {
    console.warn("[Descomplica] Nenhum card com preço encontrado, usando fallback de links");

    // Extrair preço global da página (banner/hellobar)
    const pageText = $("body").text();
    const globalPrices = extractPricesFromText(pageText);

    $("a[href*='/pos-graduacao/']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text.length > 10 && text.length < 200 && href && !href.includes("#")) {
        if (seenTitles.has(text)) return;
        seenTitles.add(text);
        offers.push({
          title: text,
          modality: "EAD",
          priceRaw: globalPrices.priceRaw,
          installmentsRaw: globalPrices.installmentsRaw,
          campaignName: globalPrices.campaignName,
          sourceUrl: url,
          coursePageUrl: new URL(href, url).href,
          confidenceScore: 0.4,
        });
      }
    });
  }

  console.log(`[Descomplica] ${offers.length} ofertas extraídas (${offers.filter((o) => o.priceRaw || o.installmentsRaw).length} com preço)`);
  return offers;
}

// ──────────────────────────────────────────────
// PUCRS ONLINE
// ──────────────────────────────────────────────
const PUCRS_URL = "https://online.pucrs.br/cursos/pos-graduacao";

export async function extractPucrs(url = PUCRS_URL): Promise<RawCourseOffer[]> {
  console.log("[PUCRS] Iniciando extração...");
  const { html } = await browserFetch(url, {
    waitForNetworkIdle: true,
    takeScreenshot: false,
  });

  const $ = cheerio.load(html);
  const offers: RawCourseOffer[] = [];
  const seenTitles = new Set<string>();

  // Extrair preço global do banner/header da PUCRS (ex: "18x sem juros")
  const headerText = $("header, [class*='banner'], [class*='hero']").text();
  const globalPrices = extractPricesFromText(headerText + " " + $("body").text().slice(0, 2000));

  // Estratégia heurística (similar à Descomplica): sections/divs com h2/h3 e links de matrícula
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

  if (filteredCards.length === 0) {
    console.warn("[PUCRS] Nenhum card encontrado, pulando fallback de links para evitar lixo");
    return offers;
  }

  for (const $card of filteredCards) {
    const title = $card.find("h2, h3, h4, [class*='title'], [class*='nome']").first().text().trim();
    
    // Ignorar títulos curtos lixos
    if (!title || title.length < 10 || title.includes("chevron_right") || title.toLowerCase() === "matricule-se") continue;
    if (seenTitles.has(title)) continue;
    
    seenTitles.add(title);
    
    let priceRaw = $card.find("[class*='price'], [class*='preco'], [class*='valor']").first().text().trim();
    const cardText = $card.text();
    const prices = !priceRaw ? extractPricesFromText(cardText) : { 
      priceRaw, 
      discountPriceRaw: undefined as string | undefined, 
      installmentsRaw: undefined as string | undefined, 
      campaignName: undefined as string | undefined 
    };

    const modality = detectModalityFromText(cardText) || "EAD";
    const href = $card.find("a[href*='/cursos/'], a[href*='/pos-graduacao/']").not("[href*='#']").first().attr("href");

    offers.push({
      title,
      modality,
      priceRaw: prices.priceRaw || globalPrices.priceRaw,
      discountPriceRaw: prices.discountPriceRaw,
      installmentsRaw: prices.installmentsRaw || globalPrices.installmentsRaw,
      campaignName: prices.campaignName || globalPrices.campaignName,
      sourceUrl: url,
      coursePageUrl: href ? new URL(href, url).href : undefined,
      confidenceScore: prices.priceRaw || globalPrices.priceRaw ? 0.7 : 0.45,
    });
  }

  console.log(`[PUCRS] ${offers.length} ofertas extraídas (${offers.filter((o) => o.priceRaw).length} com preço)`);
  return offers;
}

// ──────────────────────────────────────────────
// PUCPR ONLINE
// ──────────────────────────────────────────────
const PUCPR_URL = "https://posdigital.pucpr.br/";

export async function extractPucpr(url = PUCPR_URL): Promise<RawCourseOffer[]> {
  console.log("[PUCPR] Iniciando extração via browser...");

  const { html } = await browserFetch(url, {
    waitForNetworkIdle: true,
    waitForSelector: "a, article, [class*='course']",
    takeScreenshot: true,
  });

  const $ = cheerio.load(html);
  const offers: RawCourseOffer[] = [];
  const seenTitles = new Set<string>();

  // Extrair preço global da página
  const pageText = $("body").text().slice(0, 5000);
  const globalPrices = extractPricesFromText(pageText);

  const cardSelectors = [
    "article",
    ".course-card",
    "[class*='CardCurso']",
    "[class*='course']",
    "li.item",
  ];

  let cards = $("");
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 2) {
      cards = found;
      console.log(`[PUCPR] Seletor: ${sel} (${found.length} itens)`);
      break;
    }
  }

  if (cards.length === 0) {
    // Fallback: buscar links com texto relevante
    $("a[href*='/pos-graduacao/'], a[href*='/curso/'], a[href*='/mba']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text.length > 10 && text.length < 200 && href && !seenTitles.has(text)) {
        seenTitles.add(text);

        // Verificar se há preço no contexto do link (pai ou irmão)
        const parentText = $(el).parent().text() + " " + $(el).parent().parent().text();
        const prices = extractPricesFromText(parentText);

        offers.push({
          title: text,
          modality: "EAD",
          priceRaw: prices.priceRaw || globalPrices.priceRaw,
          installmentsRaw: prices.installmentsRaw || globalPrices.installmentsRaw,
          sourceUrl: url,
          coursePageUrl: new URL(href, url).href,
          confidenceScore: prices.priceRaw ? 0.6 : 0.35,
        });
      }
    });
    console.log(`[PUCPR] ${offers.length} ofertas extraídas (fallback)`);
    return offers.slice(0, 40);
  }

  cards.each((_, el) => {
    const $card = $(el);
    const title = $card.find("h2, h3, h4, [class*='title']").first().text().trim();
    if (!title || title.length < 5 || seenTitles.has(title)) return;
    seenTitles.add(title);

    // Tentar seletor de classe, depois fallback regex no texto do card
    let priceRaw = $card.find("[class*='preco'], [class*='price'], [class*='valor']").first().text().trim();
    const cardText = $card.text();
    const prices = !priceRaw ? extractPricesFromText(cardText) : { priceRaw };

    const modality = $card.find("[class*='modalidade']").first().text().trim() ||
      detectModalityFromText(cardText) || "EAD";
    const href = $card.find("a").first().attr("href");

    offers.push({
      title,
      modality,
      priceRaw: prices.priceRaw || undefined,
      discountPriceRaw: prices.discountPriceRaw,
      installmentsRaw: prices.installmentsRaw,
      sourceUrl: url,
      coursePageUrl: href ? new URL(href, url).href : undefined,
      confidenceScore: prices.priceRaw ? 0.7 : 0.45,
    });
  });

  console.log(`[PUCPR] ${offers.length} ofertas extraídas (${offers.filter((o) => o.priceRaw).length} com preço)`);
  return offers;
}

// ──────────────────────────────────────────────
// FGV EDUCAÇÃO EXECUTIVA
// ──────────────────────────────────────────────
const FGV_URL = "https://educacao-executiva.fgv.br/cursos/pos-graduacao";

export async function extractFgv(url = FGV_URL): Promise<RawCourseOffer[]> {
  console.log("[FGV] Iniciando extração via HTTP...");

  let html: string;
  try {
    const result = await httpFetch(url, { saveHtml: true, delayMs: 4000 });
    html = result.html;
  } catch {
    const result = await browserFetch(url, {
      waitForNetworkIdle: true,
      takeScreenshot: true,
    });
    html = result.html;
  }

  const $ = cheerio.load(html);
  const offers: RawCourseOffer[] = [];
  const seenTitles = new Set<string>();

  // FGV usa estrutura de lista
  const cardSelectors = [
    ".views-row",
    "article",
    ".view-content > div",
    "[class*='course']",
    "[class*='programa']",
  ];

  let cards = $("");
  for (const sel of cardSelectors) {
    const found = $(sel);
    if (found.length > 2) {
      cards = found;
      console.log(`[FGV] Seletor: ${sel} (${found.length} itens)`);
      break;
    }
  }

  if (cards.length === 0) {
    // Fallback: coleta todos os links de cursos
    $("a[href*='/cursos/'], a[href*='/programas/'], a[href*='/pos-graduacao/']").each((_, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text.length > 10 && href && !seenTitles.has(text)) {
        seenTitles.add(text);

        // Tentar extrair preço do contexto
        const parentText = $(el).parent().text() + " " + $(el).parent().parent().text();
        const prices = extractPricesFromText(parentText);

        offers.push({
          title: text,
          priceRaw: prices.priceRaw,
          installmentsRaw: prices.installmentsRaw,
          sourceUrl: url,
          coursePageUrl: new URL(href, url).href,
          confidenceScore: prices.priceRaw ? 0.5 : 0.3,
        });
      }
    });
    console.log(`[FGV] ${offers.length} ofertas extraídas (fallback links)`);
    return offers.slice(0, 40);
  }

  cards.each((_, el) => {
    const $card = $(el);
    const title =
      $card.find("h2, h3, h4, .field-title, [class*='title']").first().text().trim();
    if (!title || title.length < 5 || seenTitles.has(title)) return;
    seenTitles.add(title);

    // Tentar seletor de classe, depois fallback regex
    let priceRaw = $card.find("[class*='price'], [class*='valor'], [class*='invest']").first().text().trim();
    const cardText = $card.text();
    const prices = !priceRaw ? extractPricesFromText(cardText) : { priceRaw };

    const modality = $card.find("[class*='modalidade'], .field-modalidade").first().text().trim() ||
      detectModalityFromText(cardText);
    const durationRaw = $card.find("[class*='duracao'], [class*='carga'], .field-duracao").first().text().trim();
    const href = $card.find("a[href]").first().attr("href");

    offers.push({
      title,
      modality: modality || undefined,
      priceRaw: prices.priceRaw || undefined,
      discountPriceRaw: prices.discountPriceRaw,
      installmentsRaw: prices.installmentsRaw,
      sourceUrl: url,
      coursePageUrl: href ? new URL(href, url).href : undefined,
      confidenceScore: prices.priceRaw ? 0.7 : 0.45,
    });
  });

  // Executar DEEP CRAWL para os primeiros 20 cursos se não tiverem preço
  console.log(`[FGV] ${offers.length} ofertas extraídas da listagem. Verificando deep crawl...`);
  
  let deepCrawled = 0;
  for (const offer of offers) {
    if (!offer.priceRaw && offer.coursePageUrl && deepCrawled < 20) {
      try {
        deepCrawled++;
        // Fetch rápido da página do curso para buscar preço
        const detailHtml = (await httpFetch(offer.coursePageUrl, { delayMs: 1000 })).html;
        const $detail = cheerio.load(detailHtml);
        const detailPrices = extractPricesFromText($detail("body").text());
        
        if (detailPrices.priceRaw) {
          offer.priceRaw = detailPrices.priceRaw;
          offer.discountPriceRaw = detailPrices.discountPriceRaw;
          offer.installmentsRaw = detailPrices.installmentsRaw;
          offer.confidenceScore = 0.8;
        }
      } catch (err) {
        console.warn(`[FGV] Falha no deep crawl para ${offer.coursePageUrl}`);
      }
    }
  }

  console.log(`[FGV] Finalizado. ${offers.filter((o) => o.priceRaw).length} ofertas com preço.`);
  return offers;
}
