"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Globe,
  Bell,
  BarChart3,
  TrendingUp,
  MapPin,
  RefreshCw,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

interface Indicators {
  summary: {
    totalOffers: number;
    totalCompetitors: number;
    totalSources: number;
    totalChangesThisWeek: number;
  };
  avgByModality: { modality: string; avgPrice: number | null; count: number }[];
  avgByArea: { area: string | null; avgPrice: number | null; count: number }[];
  activeCampaigns: {
    campaignName: string;
    competitor: { name: string };
    title: string;
    fullPrice: number | null;
    discountPrice: number | null;
  }[];
  recentChanges: {
    id: string;
    changeType: string;
    fieldName: string | null;
    oldValue: string | null;
    newValue: string | null;
    detectedAt: string;
    offer: { title: string; competitor: { name: string }; fullPrice: number | null };
  }[];
  areaConcentration: { area: string | null; count: number }[];
}

function formatBRL(n: number | null | undefined) {
  if (!n) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const MODALITY_MAP: Record<string, string> = {
  EAD: "EAD / Online",
  PRESENCIAL: "Presencial",
  HIBRIDO: "Híbrido",
  DESCONHECIDO: "Não especificado",
};

export default function DashboardPage() {
  const [data, setData] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/indicators");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <PageHeader
          title="Dashboard Analítico"
          description="Visão geral do cenário competitivo de Pós-Graduação Lato Sensu."
        />
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-500">Carregando indicadores do banco de dados...</p>
          </div>
        </div>
      </div>
    );
  }

  const { summary, avgByModality, activeCampaigns, recentChanges, areaConcentration } = data;
  const maxAreaCount = Math.max(...areaConcentration.map((a) => a.count), 1);

  const STATS = [
    {
      label: "Cursos Mapeados",
      value: summary.totalOffers.toLocaleString("pt-BR"),
      href: "/dashboard/courses",
      icon: BookOpen,
      iconBg: "bg-blue-50 dark:bg-blue-950",
      iconText: "text-blue-600 dark:text-blue-400",
      border: "border-l-blue-500",
      detail: `${summary.totalOffers} ofertas ativas`,
      badge: "Catálogo",
    },
    {
      label: "Concorrentes Monitorados",
      value: summary.totalCompetitors.toString(),
      href: "/dashboard/competitors",
      icon: Users,
      iconBg: "bg-violet-50 dark:bg-violet-950",
      iconText: "text-violet-600 dark:text-violet-400",
      border: "border-l-violet-500",
      detail: `${summary.totalSources} fontes de coleta`,
      badge: "Monitoramento",
    },
    {
      label: "Fontes Ativas",
      value: summary.totalSources.toString(),
      href: "/dashboard/sources",
      icon: Globe,
      iconBg: "bg-emerald-50 dark:bg-emerald-950",
      iconText: "text-emerald-600 dark:text-emerald-400",
      border: "border-l-emerald-500",
      detail: "Execução automatizada",
      badge: "Coletas",
    },
    {
      label: "Mudanças (7 dias)",
      value: summary.totalChangesThisWeek.toString(),
      href: "/dashboard/indicators",
      icon: Bell,
      iconBg: "bg-amber-50 dark:bg-amber-950",
      iconText: "text-amber-600 dark:text-amber-400",
      border: "border-l-amber-500",
      detail: summary.totalChangesThisWeek > 0 ? "Alterações detectadas" : "Nenhuma alteração",
      badge: "Alertas",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        title="Dashboard Analítico"
        description="Visão geral e inteligência de mercado do IEC Gaspar."
      >
        <button
          onClick={loadData}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar Dados
        </button>
      </PageHeader>

      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={`group relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 border-l-4 ${stat.border} rounded-xl p-4 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-150 flex flex-col justify-between`}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.iconBg}`}
                >
                  <Icon className={`w-5 h-5 ${stat.iconText}`} />
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {stat.badge}
                </span>
              </div>

              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums leading-none mb-1">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {stat.label}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  {stat.detail}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Conteúdo Principal */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* Preço Médio por Modalidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-950 text-blue-600">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Preço Médio por Modalidade
              </h2>
            </div>
            <Link
              href="/dashboard/courses"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
            >
              Ver cursos <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {avgByModality.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum curso cadastrado no momento.</p>
          ) : (
            <div className="space-y-4">
              {avgByModality.map((item) => (
                <div
                  key={item.modality}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {MODALITY_MAP[item.modality] ?? item.modality}
                    </p>
                    <p className="text-xs text-slate-500">{item.count} cursos cadastrados</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatBRL(item.avgPrice)}
                    </p>
                    <p className="text-[10px] text-slate-400">valor médio</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Concentração por Área de Conhecimento */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-950 text-violet-600">
                <MapPin className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Distribuição por Área
              </h2>
            </div>
            <Link
              href="/dashboard/indicators"
              className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5"
            >
              Indicadores <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {areaConcentration.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem dados de área mapeados.</p>
          ) : (
            <div className="space-y-3">
              {areaConcentration.map((area) => {
                const pct = Math.round((area.count / maxAreaCount) * 100);
                return (
                  <div key={area.area ?? "outros"} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                        {area.area ?? "Outros / Não especificado"}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {area.count} cursos
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-violet-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Campanhas Ativas de Desconto */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-600">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Campanhas em Destaque
              </h2>
            </div>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {activeCampaigns.length} ativas
            </span>
          </div>

          {activeCampaigns.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma campanha promocional ativa detectada.</p>
          ) : (
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {activeCampaigns.slice(0, 5).map((camp, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg border border-amber-100 dark:border-amber-950 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {camp.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{camp.competitor.name}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      {camp.campaignName}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    {camp.discountPrice ? (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatBRL(camp.discountPrice)}
                      </p>
                    ) : null}
                    {camp.fullPrice ? (
                      <p
                        className={`text-[10px] ${
                          camp.discountPrice ? "line-through text-slate-400" : "font-semibold text-slate-700 dark:text-slate-300"
                        } tabular-nums`}
                      >
                        {formatBRL(camp.fullPrice)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linha inferior de navegação rápida */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-lg font-bold">Monitoramento Ativo de Concorrentes</h3>
          <p className="text-sm text-blue-100 mt-1">
            Os robôs de extração verificam autonomamente PUCRS, PUCPR, FGV e Descomplica.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/sources"
            className="px-4 py-2 rounded-lg bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 transition shadow-xs"
          >
            Disparar Coleta
          </Link>
          <Link
            href="/dashboard/courses"
            className="px-4 py-2 rounded-lg bg-blue-700 text-white text-sm font-semibold hover:bg-blue-800 transition border border-blue-500"
          >
            Ver Cursos ({summary.totalOffers})
          </Link>
        </div>
      </div>
    </div>
  );
}
