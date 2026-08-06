"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  TrendingDown, TrendingUp, Activity, Bell, MapPin, RefreshCw, ArrowUpDown
} from "lucide-react";

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

function formatBRL(n: number | null) {
  if (!n) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const MODALITY_LABELS: Record<string, string> = {
  EAD: "EAD / Online",
  PRESENCIAL: "Presencial",
  HIBRIDO: "Híbrido",
  DESCONHECIDO: "Não identificado",
};

const CHANGE_LABELS: Record<string, { label: string; color: string }> = {
  PRICE_CHANGE: { label: "Mudança de preço", color: "text-amber-600 dark:text-amber-400" },
  CAMPAIGN_ADDED: { label: "Campanha adicionada", color: "text-blue-600 dark:text-blue-400" },
  CAMPAIGN_REMOVED: { label: "Campanha encerrada", color: "text-slate-500" },
  ENROLLMENT_OPENED: { label: "Inscrições abertas", color: "text-emerald-600 dark:text-emerald-400" },
  ENROLLMENT_CLOSED: { label: "Inscrições encerradas", color: "text-red-600 dark:text-red-400" },
  NEW_COURSE: { label: "Novo curso detectado", color: "text-violet-600 dark:text-violet-400" },
};

export default function IndicatorsPage() {
  const [data, setData] = useState<Indicators | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/indicators");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-slate-300 animate-spin" />
      </div>
    );
  }

  const { summary, avgByModality, avgByArea, activeCampaigns, recentChanges, areaConcentration } = data;
  const maxAreaCount = Math.max(...areaConcentration.map((a) => a.count), 1);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        title="Indicadores"
        description="KPIs e sinais do mercado de pós-graduação concorrente."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Ofertas Mapeadas", value: summary.totalOffers.toLocaleString("pt-BR"), icon: Activity, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950" },
          { label: "Concorrentes Ativos", value: summary.totalCompetitors, icon: MapPin, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950" },
          { label: "Fontes Monitoradas", value: summary.totalSources, icon: TrendingDown, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950" },
          { label: "Mudanças esta semana", value: summary.totalChangesThisWeek, icon: Bell, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950" },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${s.bg}`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
        {/* Preço médio por modalidade */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpDown className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Preço Médio por Modalidade</h2>
          </div>
          {avgByModality.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem dados — execute um crawler.</p>
          ) : (
            <div className="space-y-3">
              {avgByModality.map((r) => (
                <div key={r.modality} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{MODALITY_LABELS[r.modality] ?? r.modality}</p>
                    <p className="text-xs text-slate-400">{r.count} cursos</p>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatBRL(r.avgPrice)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Concentração por área */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-violet-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Concentração por Área</h2>
          </div>
          {areaConcentration.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {areaConcentration.map((r) => {
                const pct = Math.round((r.count / maxAreaCount) * 100);
                return (
                  <div key={r.area}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{r.area ?? "Outros"}</span>
                      <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-slate-300">{r.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                      <div className="bg-violet-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preço médio por área */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Preço Médio por Área</h2>
          </div>
          {avgByArea.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem dados ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {avgByArea.slice(0, 7).map((r) => (
                <div key={r.area} className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{r.area ?? "Outros"}</span>
                  <span className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{formatBRL(r.avgPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Campanhas ativas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Campanhas Ativas</h2>
            <span className="ml-auto text-xs text-slate-400">{activeCampaigns.length} detectadas</span>
          </div>
          {activeCampaigns.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma campanha ativa detectada.</p>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {activeCampaigns.slice(0, 20).map((c, i) => (
                <div key={i} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{c.title}</p>
                    <p className="text-[11px] text-slate-500">{c.competitor.name}</p>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 mt-0.5">
                      {c.campaignName}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    {c.discountPrice && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatBRL(c.discountPrice)}</p>
                    )}
                    {c.fullPrice && (
                      <p className={`text-[11px] ${c.discountPrice ? "line-through text-slate-400" : "font-medium text-slate-700 dark:text-slate-300"}`}>
                        {formatBRL(c.fullPrice)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mudanças recentes */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-slate-800 dark:text-white">Mudanças Recentes (7 dias)</h2>
            <span className="ml-auto text-xs text-slate-400">{recentChanges.length} eventos</span>
          </div>
          {recentChanges.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma mudança detectada esta semana.</p>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto">
              {recentChanges.slice(0, 20).map((c) => {
                const cfg = CHANGE_LABELS[c.changeType];
                return (
                  <div key={c.id} className="py-1.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <div className="flex items-start gap-2">
                      <span className={`text-[11px] font-semibold ${cfg?.color ?? "text-slate-500"} shrink-0 mt-0.5`}>
                        {cfg?.label ?? c.changeType}
                      </span>
                      <p className="text-xs text-slate-500 truncate">{c.offer.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-slate-400">{c.offer.competitor.name}</span>
                      {c.oldValue && c.newValue && (
                        <span className="text-[11px] text-slate-400">
                          {c.oldValue} → <span className="font-medium text-slate-600 dark:text-slate-300">{c.newValue}</span>
                        </span>
                      )}
                      <span className="ml-auto text-[10px] text-slate-400 tabular-nums">
                        {new Date(c.detectedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
