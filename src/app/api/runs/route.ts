import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sourceId     = searchParams.get("sourceId");
  const competitorId = searchParams.get("competitorId");
  const status       = searchParams.get("status");
  const page         = parseInt(searchParams.get("page") ?? "1");
  const limit        = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
  const skip         = (page - 1) * limit;

  const where: Record<string, unknown> = {
    ...(sourceId ? { sourceId } : {}),
    ...(status ? { status } : {}),
    ...(competitorId ? { source: { competitorId } } : {}),
  };

  const [runs, total] = await Promise.all([
    prisma.crawlRun.findMany({
      where,
      include: {
        source: {
          include: {
            competitor: { select: { id: true, name: true, slug: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.crawlRun.count({ where }),
  ]);

  return NextResponse.json({
    runs,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
