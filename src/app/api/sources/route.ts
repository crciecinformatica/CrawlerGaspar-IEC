import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const competitorId = searchParams.get("competitorId");
  const activeOnly = searchParams.get("active") !== "false";

  const sources = await prisma.source.findMany({
    where: {
      ...(activeOnly ? { active: true } : {}),
      ...(competitorId ? { competitorId } : {}),
    },
    include: {
      competitor: { select: { id: true, name: true, slug: true } },
      crawlRuns: {
        orderBy: { startedAt: "desc" },
        take: 3,
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          durationMs: true,
          offersFound: true,
          offersNew: true,
          offersChanged: true,
          errorMessage: true,
          contentHash: true,
        },
      },
    },
    orderBy: [{ competitor: { name: "asc" } }, { label: "asc" }],
  });

  return NextResponse.json({ sources });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { competitorId, url, label, fetcherType, frequency } = body;

  if (!competitorId || !url || !label) {
    return NextResponse.json(
      { error: "competitorId, url e label são obrigatórios" },
      { status: 400 }
    );
  }

  const source = await prisma.source.create({
    data: {
      competitorId,
      url,
      label,
      fetcherType: fetcherType ?? "HTTP",
      frequency: frequency ?? "WEEKLY",
      active: true,
    },
  });

  return NextResponse.json({ source }, { status: 201 });
}
