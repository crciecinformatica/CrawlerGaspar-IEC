import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCrawlerForSource, runAllActiveSources } from "@/crawler/runner";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sourceId, all } = body as { sourceId?: string; all?: boolean };

  if (all) {
    // Dispara todos de forma assíncrona (fire-and-forget para MVP)
    const results = await runAllActiveSources();
    return NextResponse.json({ results });
  }

  if (sourceId) {
    const result = await runCrawlerForSource(sourceId);
    return NextResponse.json({ result });
  }

  return NextResponse.json(
    { error: "Forneça sourceId ou all=true" },
    { status: 400 }
  );
}

// GET retorna status do último run de cada source ativa
export async function GET() {
  const sources = await prisma.source.findMany({
    where: { active: true },
    include: {
      competitor: { select: { name: true, slug: true } },
      crawlRuns: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          startedAt: true,
          durationMs: true,
          offersFound: true,
          errorMessage: true,
        },
      },
    },
  });

  return NextResponse.json({ sources });
}
