import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "false";

  try {
    const competitors = await prisma.competitor.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: {
        sources: {
          where: { active: true },
          select: {
            id: true,
            label: true,
            url: true,
            fetcherType: true,
            frequency: true,
            crawlRuns: {
              orderBy: { startedAt: "desc" },
              take: 1,
              select: {
                status: true,
                startedAt: true,
                offersFound: true,
                errorMessage: true,
              },
            },
          },
        },
        _count: {
          select: { offers: { where: { isLatest: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

  const result = competitors.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    website: c.website,
    active: c.active,
    offersCount: c._count.offers,
    sourcesCount: c.sources.length,
    lastCrawl: c.sources
      .flatMap((s) => s.crawlRuns)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0] ?? null,
    sources: c.sources,
  }));

    return NextResponse.json({ competitors: result });
  } catch (error) {
    console.error("Error fetching competitors:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor ao buscar concorrentes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, name, website } = body;

  if (!slug || !name) {
    return NextResponse.json({ error: "slug e name são obrigatórios" }, { status: 400 });
  }

  const competitor = await prisma.competitor.create({
    data: { slug, name, website, active: true },
  });

  return NextResponse.json({ competitor }, { status: 201 });
}
