#!/usr/bin/env ts-node
/**
 * CLI para executar crawlers manualmente
 * Uso:
 *   npm run crawler:run                   → executa todas as fontes ativas
 *   npm run crawler:run -- --source pucrs → executa todas as fontes de um concorrente
 *   npm run crawler:run -- --sourceId <id> → executa uma fonte específica
 */

import "dotenv/config";
import { runCrawlerForSource, runAllActiveSources } from "./runner";
import { prisma } from "../lib/prisma";

async function main() {
  const args = process.argv.slice(2);
  const sourceArg = args.indexOf("--source");
  const sourceIdArg = args.indexOf("--sourceId");

  if (sourceIdArg !== -1 && args[sourceIdArg + 1]) {
    const sourceId = args[sourceIdArg + 1];
    console.log(`\n🚀 Executando crawler para sourceId: ${sourceId}\n`);
    const result = await runCrawlerForSource(sourceId);
    console.log("\n📊 Resultado:", result);
  } else if (sourceArg !== -1 && args[sourceArg + 1]) {
    const slug = args[sourceArg + 1];
    const competitor = await prisma.competitor.findUnique({ where: { slug } });
    if (!competitor) {
      console.error(`❌ Concorrente "${slug}" não encontrado.`);
      process.exit(1);
    }

    const sources = await prisma.source.findMany({
      where: { competitorId: competitor.id, active: true },
    });

    console.log(`\n🚀 Executando ${sources.length} fontes para: ${competitor.name}\n`);
    for (const src of sources) {
      const result = await runCrawlerForSource(src.id);
      console.log(`  → ${src.label}: ${result.status} (${result.offersFound} ofertas)`);
    }
  } else {
    console.log("\n🚀 Executando todas as fontes ativas...\n");
    const results = await runAllActiveSources();

    console.log("\n📊 Resumo:");
    let totalOffers = 0;
    let totalNew = 0;
    let totalChanged = 0;
    for (const r of results) {
      totalOffers += r.offersFound;
      totalNew += r.offersNew;
      totalChanged += r.offersChanged;
      const emoji = r.status === "SUCCESS" ? "✅" : "❌";
      console.log(
        `  ${emoji} ${r.sourceId}: ${r.status} | ${r.offersFound} encontradas | +${r.offersNew} novas | ~${r.offersChanged} alteradas | ${(r.durationMs / 1000).toFixed(1)}s`
      );
    }
    console.log(`\nTotal: ${totalOffers} ofertas | +${totalNew} novas | ~${totalChanged} alteradas`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌ Erro:", e);
  await prisma.$disconnect();
  process.exit(1);
});
