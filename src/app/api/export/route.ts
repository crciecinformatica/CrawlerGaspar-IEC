import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competitorId = searchParams.get("competitorId");
  const modality = searchParams.get("modality");
  const area = searchParams.get("area");
  const campaign = searchParams.get("campaign");

  const where: Record<string, unknown> = {
    isLatest: true,
    ...(competitorId ? { competitorId } : {}),
    ...(modality ? { modality } : {}),
    ...(area ? { area } : {}),
    ...(campaign === "true" ? { campaignName: { not: null } } : {}),
  };

  const offers = await prisma.courseOffer.findMany({
    where,
    include: {
      competitor: { select: { name: true } },
    },
    orderBy: { scrapedAt: "desc" },
    take: 5000,
  });

  // Gerar CSV
  const headers = [
    "Instituição",
    "Título do Curso",
    "Área",
    "Modalidade",
    "Preço Cheio (R$)",
    "Preço com Desconto (R$)",
    "Parcelas",
    "Valor da Parcela (R$)",
    "Preço Oculto",
    "Campanha",
    "Inscrições Abertas",
    "Data de Início",
    "Carga Horária (h)",
    "Duração (meses)",
    "Confiança",
    "Evidência de Preço",
    "URL da Fonte",
    "Data de Coleta",
  ];

  const rows = offers.map((o) => [
    o.competitor.name,
    `"${o.title.replace(/"/g, '""')}"`,
    o.area ?? "",
    o.modality,
    o.fullPrice ?? "",
    o.discountPrice ?? "",
    o.installments ?? "",
    o.installmentValue ?? "",
    o.isPriceHidden ? "Sim" : "Não",
    o.campaignName ? `"${o.campaignName.replace(/"/g, '""')}"` : "",
    o.enrollmentOpen ? "Sim" : "Não",
    o.startDate ? new Date(o.startDate).toLocaleDateString("pt-BR") : "",
    o.workloadHours ?? "",
    o.durationMonths ?? "",
    o.confidenceScore.toFixed(2),
    o.priceEvidence ? `"${o.priceEvidence.replace(/"/g, '""')}"` : "",
    o.sourceUrl,
    new Date(o.scrapedAt).toLocaleString("pt-BR"),
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const bom = "\uFEFF"; // BOM para Excel reconhecer UTF-8

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="iec-gaspar-ofertas-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
