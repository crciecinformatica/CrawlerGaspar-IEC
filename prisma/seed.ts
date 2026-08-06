import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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

  const ids: Record<string, string> = {};
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
  // FONTES (URLs de monitoramento)
  // ──────────────────────────────────────────────
  const sources = [
    // PUCRS
    { competitorId: ids.pucrs, url: "https://online.pucrs.br/cursos/pos-graduacao",             label: "PUCRS — Catálogo Pós-Graduação",  fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    { competitorId: ids.pucrs, url: "https://online.pucrs.br/cursos/pos-graduacao?area=saude",  label: "PUCRS — Pós em Saúde",            fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    { competitorId: ids.pucpr, url: "https://posdigital.pucpr.br/",                        label: "PUCPR — Pós Digital Catálogo",     fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    { competitorId: ids.pucpr, url: "https://www.pucpr.br/pos-graduacao/",                 label: "PUCPR — Catálogo Geral Pós",       fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    // FGV
    { competitorId: ids.fgv,   url: "https://educacao-executiva.fgv.br/cursos/pos-graduacao",   label: "FGV — Catálogo Pós-Graduação",    fetcherType: "HTTP"    as const, frequency: "WEEKLY" as const },
    { competitorId: ids.fgv,   url: "https://educacao-executiva.fgv.br/mba",                    label: "FGV — MBA",                       fetcherType: "HTTP"    as const, frequency: "WEEKLY" as const },
    // Descomplica
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/",                   label: "Descomplica — Catálogo completo", fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/?area=saude",        label: "Descomplica — Pós em Saúde",      fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/?area=direito",      label: "Descomplica — Pós em Direito",    fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
    { competitorId: ids.descomplica, url: "https://descomplica.com.br/pos-graduacao/?area=tecnologia",   label: "Descomplica — Pós em Tecnologia", fetcherType: "BROWSER" as const, frequency: "WEEKLY" as const },
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
