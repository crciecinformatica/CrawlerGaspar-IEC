import { z } from "zod";

// ──────────────────────────────────────────────
// Contrato Zod para dados BRUTOS extraídos da página
// Todos os campos são opcionais pois dependem da fonte
// ──────────────────────────────────────────────
export const RawCourseOfferSchema = z.object({
  title: z.string().min(3),
  area: z.string().optional(),
  modality: z.string().optional(),
  durationMonths: z.number().int().positive().optional(),
  workloadHours: z.number().int().positive().optional(),

  // Preço bruto — texto original da página
  priceRaw: z.string().optional(),
  discountPriceRaw: z.string().optional(),
  installmentsRaw: z.string().optional(),

  // Campanha
  campaignName: z.string().optional(),
  campaignDeadlineRaw: z.string().optional(),
  enrollmentOpen: z.boolean().optional(),
  startDateRaw: z.string().optional(),

  // Identificação
  sourceUrl: z.string().url(),
  coursePageUrl: z.string().url().optional(),
  description: z.string().optional(),

  // Confiança 0-1: quão seguro é que o dado foi corretamente extraído
  confidenceScore: z.number().min(0).max(1).default(0.5),
});

export type RawCourseOffer = z.infer<typeof RawCourseOfferSchema>;

// ──────────────────────────────────────────────
// Contrato para oferta já NORMALIZADA
// ──────────────────────────────────────────────
export const NormalizedCourseOfferSchema = z.object({
  title: z.string(),
  area: z.string().optional(),
  modality: z.enum(["EAD", "PRESENCIAL", "HIBRIDO", "DESCONHECIDO"]),
  durationMonths: z.number().int().optional(),
  workloadHours: z.number().int().optional(),

  fullPrice: z.number().positive().optional(),
  discountPrice: z.number().positive().optional(),
  installments: z.number().int().positive().optional(),
  installmentValue: z.number().positive().optional(),
  isPriceHidden: z.boolean().default(false),

  campaignName: z.string().optional(),
  campaignDeadline: z.date().optional(),
  enrollmentOpen: z.boolean().default(true),
  startDate: z.date().optional(),

  sourceUrl: z.string().url(),
  courseKey: z.string(),     // chave estável para deduplicação
  confidenceScore: z.number().min(0).max(1),
  priceEvidence: z.string().optional(),
  campaignEvidence: z.string().optional(),
  description: z.string().optional(),
});

export type NormalizedCourseOffer = z.infer<typeof NormalizedCourseOfferSchema>;
