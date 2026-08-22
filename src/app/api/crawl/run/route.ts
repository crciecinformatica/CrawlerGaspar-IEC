import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runAllActiveSources, runCrawlerForSource } from "@/crawler/runner";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sourceId, all } = body as { sourceId?: string; all?: boolean };

  if (all) {
    try {
      // Dispara em background (fire and forget)
      runAllActiveSources().catch((e) => {
        console.error("Erro na execução do crawler em background:", e.message || e);
      });
      return NextResponse.json({ message: "SUCCESS" });
    } catch (e: any) {
      console.error("Erro ao iniciar crawler:", e.message || e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (sourceId) {
    try {
      // Dispara em background
      runCrawlerForSource(sourceId).catch((e) => {
        console.error("Erro na execução do crawler em background:", e.message || e);
      });
      return NextResponse.json({ message: "SUCCESS" });
    } catch (e: any) {
      console.error("Erro ao iniciar crawler:", e.message || e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
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
