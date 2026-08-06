/**
 * Seed script — executar com:
 *   node prisma/seed.mjs
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // ──────────────────────────────────────────────
  // CONCORRENTES
  // ──────────────────────────────────────────────
  const competitors = [
    { slug: "pucrs",       name: "PUCRS Online",           website: "https://online.pucrs.br" },
    { slug: "pucpr",       name: "PUCPR Online",           website: "https://online.pucpr.br" },
    { slug: "fgv",         name: "FGV Educação Executiva", website: "https://educacao-executiva.fgv.br" },
    { slug: "descomplica", name: "Descomplica",             website: "https://descomplica.com.br" },
  ];

  const ids = {};
  for (const comp of competitors) {
    const created = await prisma.competitor.upsert({
      where: { slug: comp.slug },
      update: { name: comp.name, website: comp.website },
      create: { slug: comp.slug, name: comp.name, website: comp.website, active: true },
    });
    ids[comp.slug] = created.id;
    console.log(`✅ Concorrente: ${created.name} (${created.id})`);
  }

  // ──────────────────────────────────────────────
  // FONTES
  // ──────────────────────────────────────────────
  const sources = [
    // PUCRS
    { competitorId: ids.pucrs, url: "https://online.pucrs.br/cursos/pos-graduacao",            label: "PUCRS — Catálogo Pós-Graduação",   fetcherType: "BROWSER", frequency: "WEEKLY" },
    { competitorId: ids.pucrs, url: "https://online.pucrs.br/cursos/pos-graduacao?area=saude", label: "PUCRS — Pós em Saúde",             fetcherType: "BROWSER", frequency: "WEEKLY" },
    // PUCPR
    { competitorId: ids.pucpr, url: "https://online.pucpr.br/pos-graduacao",                   label: "PUCPR — Catálogo Pós-Graduação",   fetcherType: "HTTP",    frequency: "WEEKLY" },
    { competitorId: ids.pucpr, url: "https://online.pucpr.br/pos-graduacao?area=direito",      label: "PUCPR — Pós em Direito",           fetcherType: "HTTP",    frequency: "WEEKLY" },
    // FGV
    { competitorId: ids.fgv,   url: "https://educacao-executiva.fgv.br/cursos/pos-graduacao",  label: "FGV — Catálogo Pós-Graduação",     fetcherType: "HTTP",    frequency: "WEEKLY" },
    { competitorId: ids.fgv,   url: "https://educacao-executiva.fgv.br/mba",                   label: "FGV — MBA",                        fetcherType: "HTTP",    frequency: "WEEKLY" },
    // Descomplica
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/",                    label: "Descomplica — Catálogo completo",  fetcherType: "BROWSER", frequency: "WEEKLY" },
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/?area=saude",         label: "Descomplica — Pós em Saúde",       fetcherType: "BROWSER", frequency: "WEEKLY" },
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/?area=direito",       label: "Descomplica — Pós em Direito",     fetcherType: "BROWSER", frequency: "WEEKLY" },
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/?area=tecnologia",    label: "Descomplica — Pós em Tecnologia",  fetcherType: "BROWSER", frequency: "WEEKLY" },
  ];

  for (const src of sources) {
    const existing = await prisma.source.findFirst({ where: { url: src.url } });
    if (existing) {
      console.log(`⚠️  Fonte já existe: ${src.label}`);
      continue;
    }
    const created = await prisma.source.create({ data: src });
    console.log(`✅ Fonte: ${created.label}`);
  }

  console.log("\n🎉 Seed concluído com sucesso!");
}

main()
  .catch((e) => { console.error("❌ Erro no seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
