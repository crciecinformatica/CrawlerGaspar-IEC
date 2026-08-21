import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { sourceId, all } = body as { sourceId?: string; all?: boolean };

  if (all) {
    // Fire and forget, or wait for it. We will wait so UI can poll correctly.
    try {
      await execAsync("npx tsx src/crawler/cli.ts");
      return NextResponse.json({ message: "SUCCESS" });
    } catch (e: any) {
      console.error("Erro na execução via CLI:", e.message || e);
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  if (sourceId) {
    try {
      await execAsync(`npx tsx src/crawler/cli.ts --sourceId ${sourceId}`);
      return NextResponse.json({ message: "SUCCESS" });
    } catch (e: any) {
      console.error("Erro na execução via CLI:", e.message || e);
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
