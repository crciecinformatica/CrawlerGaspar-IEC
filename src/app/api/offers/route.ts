import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const competitorId = searchParams.get("competitorId");
  const modality     = searchParams.get("modality");
  const area         = searchParams.get("area");
  const campaign     = searchParams.get("campaign");
  const minPrice     = searchParams.get("minPrice");
  const maxPrice     = searchParams.get("maxPrice");
  const latestOnly   = searchParams.get("latest") !== "false";
  const page         = parseInt(searchParams.get("page") ?? "1");
  const limit        = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const skip         = (page - 1) * limit;

  const where: Record<string, unknown> = {
    ...(latestOnly ? { isLatest: true } : {}),
    ...(competitorId ? { competitorId } : {}),
    ...(modality ? { modality } : {}),
    ...(area ? { area } : {}),
    ...(campaign === "true" ? { campaignName: { not: null } } : {}),
    ...(minPrice || maxPrice
      ? {
          fullPrice: {
            ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
            ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
          },
        }
      : {}),
  };

  const [offers, total] = await Promise.all([
    prisma.courseOffer.findMany({
      where,
      include: {
        competitor: { select: { id: true, name: true, slug: true } },
        crawlRun: { select: { startedAt: true, status: true } },
      },
      orderBy: { scrapedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.courseOffer.count({ where }),
  ]);

  return NextResponse.json({
    offers,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
