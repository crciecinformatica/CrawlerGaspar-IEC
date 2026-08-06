import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Preço médio por modalidade (apenas ofertas com isLatest=true e preço visível)
  const avgByModality = await prisma.courseOffer.groupBy({
    by: ["modality"],
    where: { isLatest: true, isPriceHidden: false, fullPrice: { not: null } },
    _avg: { fullPrice: true },
    _count: { id: true },
  });

  // Preço médio por área
  const avgByArea = await prisma.courseOffer.groupBy({
    by: ["area"],
    where: { isLatest: true, isPriceHidden: false, fullPrice: { not: null }, area: { not: null } },
    _avg: { fullPrice: true },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  // Campanhas ativas por concorrente
  const activeCampaigns = await prisma.courseOffer.findMany({
    where: {
      isLatest: true,
      campaignName: { not: null },
    },
    select: {
      campaignName: true,
      competitor: { select: { name: true, slug: true } },
      title: true,
      fullPrice: true,
      discountPrice: true,
    },
    orderBy: { scrapedAt: "desc" },
    take: 50,
  });

  // Mudanças detectadas nos últimos 7 dias
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentChanges = await prisma.offerChangeEvent.findMany({
    where: { detectedAt: { gte: sevenDaysAgo } },
    include: {
      offer: {
        select: {
          title: true,
          competitor: { select: { name: true } },
          fullPrice: true,
        },
      },
    },
    orderBy: { detectedAt: "desc" },
    take: 30,
  });

  // Concentração por área (top áreas com mais ofertas)
  const areaConcentration = await prisma.courseOffer.groupBy({
    by: ["area"],
    where: { isLatest: true, area: { not: null } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 8,
  });

  // Totais gerais
  const totalOffers = await prisma.courseOffer.count({ where: { isLatest: true } });
  const totalCompetitors = await prisma.competitor.count({ where: { active: true } });
  const totalSources = await prisma.source.count({ where: { active: true } });
  const totalChangesThisWeek = await prisma.offerChangeEvent.count({
    where: { detectedAt: { gte: sevenDaysAgo } },
  });

  return NextResponse.json({
    summary: { totalOffers, totalCompetitors, totalSources, totalChangesThisWeek },
    avgByModality: avgByModality.map((r) => ({
      modality: r.modality,
      avgPrice: r._avg.fullPrice ? Math.round(r._avg.fullPrice) : null,
      count: r._count.id,
    })),
    avgByArea: avgByArea.map((r) => ({
      area: r.area,
      avgPrice: r._avg.fullPrice ? Math.round(r._avg.fullPrice) : null,
      count: r._count.id,
    })),
    activeCampaigns,
    recentChanges,
    areaConcentration: areaConcentration.map((r) => ({
      area: r.area,
      count: r._count.id,
    })),
  });
}
