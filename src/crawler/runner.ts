import { prisma } from "../lib/prisma";
import { RawCourseOffer, NormalizedCourseOffer } from "./extractors/base";
import {
  extractDescomplica,
  extractPucrs,
  extractPucpr,
  extractFgv,
} from "./extractors/extractors";
import {
  normalizePrice,
  extractFullPrice,
  normalizeInstallments,
  normalizeModality,
  normalizeDuration,
  normalizeWorkload,
  normalizeDate,
  generateCourseKey,
  detectHiddenPrice,
  inferArea,
} from "./normalizer";
import { detectChanges } from "./differ";

// Mapa slug → função extratora
const EXTRACTORS: Record<string, (url: string) => Promise<RawCourseOffer[]>> = {
  descomplica: extractDescomplica,
  pucrs: extractPucrs,
  pucpr: extractPucpr,
  fgv: extractFgv,
};

/**
 * Normaliza uma oferta bruta para o formato canônico
 */
function normalizeOffer(
  raw: RawCourseOffer,
  competitorSlug: string
): NormalizedCourseOffer {
  const priceHidden = detectHiddenPrice(raw.priceRaw ?? "");
  
  // Extrair preço cheio e com desconto
  const allPriceText = [raw.priceRaw, raw.discountPriceRaw, raw.installmentsRaw]
    .filter(Boolean)
    .join(" ");

  let fullPrice = extractFullPrice(allPriceText) ?? normalizePrice(raw.priceRaw);
  let discountPrice = normalizePrice(raw.discountPriceRaw);
  
  // Se temos raw.priceRaw com padrão "De X por Y", normalizePrice retorna o menor (desconto)
  // e extractFullPrice retorna o maior (cheio)
  if (fullPrice && discountPrice && discountPrice >= fullPrice) {
    // Swap se estão invertidos
    [fullPrice, discountPrice] = [discountPrice, fullPrice];
  }

  const { installments, installmentValue } = normalizeInstallments(
    raw.installmentsRaw ?? raw.priceRaw
  );

  // Se não temos preço mas temos parcelas, calcular preço total
  if (!fullPrice && installments && installmentValue) {
    fullPrice = installments * installmentValue;
  }

  return {
    title: raw.title,
    area: raw.area ?? inferArea(raw.title),
    modality: normalizeModality(raw.modality),
    durationMonths: raw.durationMonths ?? normalizeDuration(raw.modality),
    workloadHours: raw.workloadHours ?? normalizeWorkload(raw.modality),
    fullPrice,
    discountPrice,
    installments,
    installmentValue,
    isPriceHidden: priceHidden,
    campaignName: raw.campaignName,
    campaignDeadline: normalizeDate(raw.campaignDeadlineRaw),
    enrollmentOpen: raw.enrollmentOpen ?? true,
    startDate: normalizeDate(raw.startDateRaw),
    sourceUrl: raw.coursePageUrl ?? raw.sourceUrl,
    courseKey: generateCourseKey(competitorSlug, raw.title),
    confidenceScore: raw.confidenceScore,
    priceEvidence: raw.priceRaw,
    campaignEvidence: raw.campaignName,
    description: raw.description,
  };
}

/**
 * Persiste ofertas no banco, detectando mudanças
 */
async function persistOffers(
  offers: NormalizedCourseOffer[],
  competitorId: string,
  crawlRunId: string
): Promise<{ created: number; changed: number }> {
  let created = 0;
  let changed = 0;

  for (const offer of offers) {
    // Buscar oferta anterior com mesmo courseKey
    const previous = await prisma.courseOffer.findFirst({
      where: { courseKey: offer.courseKey, isLatest: true },
    });

    const changes = detectChanges(previous, offer);

    if (changes.length > 0 || !previous) {
      // Marcar anterior como não-latest
      if (previous) {
        await prisma.courseOffer.update({
          where: { id: previous.id },
          data: { isLatest: false },
        });
        changed++;
      } else {
        created++;
      }

      // Criar nova oferta
      const newOffer = await prisma.courseOffer.create({
        data: {
          competitorId,
          crawlRunId,
          sourceUrl: offer.sourceUrl,
          courseKey: offer.courseKey,
          title: offer.title,
          area: offer.area,
          modality: offer.modality as "EAD" | "PRESENCIAL" | "HIBRIDO" | "DESCONHECIDO",
          durationMonths: offer.durationMonths,
          workloadHours: offer.workloadHours,
          fullPrice: offer.fullPrice,
          discountPrice: offer.discountPrice,
          installments: offer.installments,
          installmentValue: offer.installmentValue,
          isPriceHidden: offer.isPriceHidden,
          campaignName: offer.campaignName,
          campaignDeadline: offer.campaignDeadline,
          enrollmentOpen: offer.enrollmentOpen,
          startDate: offer.startDate,
          confidenceScore: offer.confidenceScore,
          priceEvidence: offer.priceEvidence,
          campaignEvidence: offer.campaignEvidence,
          description: offer.description,
          isLatest: true,
        },
      });

      // Registrar eventos de mudança
      for (const change of changes) {
        await prisma.offerChangeEvent.create({
          data: {
            offerId: newOffer.id,
            changeType: change.changeType,
            fieldName: change.fieldName,
            oldValue: change.oldValue,
            newValue: change.newValue,
          },
        });
      }
    }
  }

  return { created, changed };
}

export interface RunResult {
  sourceId: string;
  crawlRunId: string;
  status: "SUCCESS" | "ERROR" | "PARTIAL";
  offersFound: number;
  offersNew: number;
  offersChanged: number;
  durationMs: number;
  errorMessage?: string;
}

/**
 * Executa crawler para uma fonte específica
 */
export async function runCrawlerForSource(sourceId: string): Promise<RunResult> {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
    include: { competitor: true },
  });

  if (!source) throw new Error(`Source ${sourceId} não encontrada`);

  const crawlRun = await prisma.crawlRun.create({
    data: { sourceId, status: "RUNNING" },
  });

  const startedAt = Date.now();

  try {
    const extractor = EXTRACTORS[source.competitor.slug];
    if (!extractor) {
      throw new Error(`Nenhum extrator definido para "${source.competitor.slug}"`);
    }

    console.log(`\n[Runner] Crawling: ${source.competitor.name} → ${source.url}`);
    const rawOffers = await extractor(source.url);

    const normalized = rawOffers
      .map((r) => {
        try {
          return normalizeOffer(r, source.competitor.slug);
        } catch (normErr) {
          console.warn(`[Runner] ⚠️ Falha ao normalizar "${r.title}": ${normErr instanceof Error ? normErr.message : normErr}`);
          return null;
        }
      })
      .filter(Boolean) as NormalizedCourseOffer[];

    const { created, changed } = await persistOffers(
      normalized,
      source.competitorId,
      crawlRun.id
    );

    const durationMs = Date.now() - startedAt;

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        durationMs,
        offersFound: rawOffers.length,
        offersNew: created,
        offersChanged: changed,
      },
    });

    return {
      sourceId,
      crawlRunId: crawlRun.id,
      status: "SUCCESS",
      offersFound: rawOffers.length,
      offersNew: created,
      offersChanged: changed,
      durationMs,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[Runner] ❌ Erro ao crawlear: ${errorMessage}`);
    if (err instanceof Error && err.stack) console.error(err.stack);
    const durationMs = Date.now() - startedAt;

    await prisma.crawlRun.update({
      where: { id: crawlRun.id },
      data: {
        status: "ERROR",
        finishedAt: new Date(),
        durationMs,
        errorMessage,
      },
    });

    return {
      sourceId,
      crawlRunId: crawlRun.id,
      status: "ERROR",
      offersFound: 0,
      offersNew: 0,
      offersChanged: 0,
      durationMs,
      errorMessage,
    };
  }
}

/**
 * Executa crawler para todas as fontes ativas
 */
export async function runAllActiveSources(): Promise<RunResult[]> {
  const sources = await prisma.source.findMany({
    where: { active: true },
    include: { competitor: true },
  });

  const results: RunResult[] = [];

  for (const source of sources) {
    const result = await runCrawlerForSource(source.id);
    results.push(result);
    console.log(
      `[Runner] ${source.competitor.name}: ${result.status} — ${result.offersFound} ofertas`
    );
  }

  return results;
}
