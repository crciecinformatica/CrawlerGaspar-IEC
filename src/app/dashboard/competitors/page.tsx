"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Play, RefreshCw, ExternalLink, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface Competitor {
  id: string;
  slug: string;
  name: string;
  website: string | null;
  active: boolean;
  offersCount: number;
  sourcesCount: number;
  lastCrawl: {
    status: string;
    startedAt: string;
    offersFound: number;
    errorMessage?: string;
  } | null;
}

function CrawlStatusIcon({ status }: { status?: string }) {
  if (!status) return <Clock className="h-3.5 w-3.5 text-slate-400" />;
  if (status === "SUCCESS") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "ERROR") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
  if (status === "RUNNING") return <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
  return <Clock className="h-3.5 w-3.5 text-amber-400" />;
}

export default function CompetitorsPage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    const res = await fetch("/api/competitors");
    const data = await res.json();
    setCompetitors(data.competitors ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function crawlAll(competitorId: string) {
    setRunningIds((prev) => new Set(prev).add(competitorId));
    // Busca fontes do concorrente e dispara cada uma
    const res = await fetch(`/api/sources?competitorId=${competitorId}`);
    const data = await res.json();
    for (const src of data.sources ?? []) {
      await fetch("/api/crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: src.id }),
      });
    }
    await load();
    setRunningIds((prev) => {
      const next = new Set(prev);
      next.delete(competitorId);
      return next;
    });
  }

  function statusLabel(status?: string) {
    if (!status) return "Nunca executado";
    if (status === "SUCCESS") return "Ativo";
    if (status === "ERROR") return "Erro";
    if (status === "RUNNING") return "Executando";
    return "Alerta";
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        title="Concorrentes"
        description="Instituições monitoradas pelo robô de extração de dados."
        total={competitors.length}
      />

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {["Instituição", "Fontes", "Cursos Mapeados", "Última Coleta", "Status", "Ação"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {competitors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                      Nenhum concorrente cadastrado. Execute o seed: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">npm run db:seed</code>
                    </td>
                  </tr>
                ) : (
                  competitors.map((comp) => {
                    const isRunning = runningIds.has(comp.id);
                    return (
                      <tr key={comp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{comp.name}</p>
                            {comp.website && (
                              <a href={comp.website} target="_blank" rel="noopener noreferrer"
                                className="text-slate-400 hover:text-blue-500 transition">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{comp.slug}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 tabular-nums">
                          {comp.sourcesCount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                          {comp.offersCount.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <CrawlStatusIcon status={comp.lastCrawl?.status} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {comp.lastCrawl
                                ? new Date(comp.lastCrawl.startedAt).toLocaleString("pt-BR")
                                : "Nunca"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge value={statusLabel(comp.lastCrawl?.status)} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => crawlAll(comp.id)}
                            disabled={isRunning || comp.sourcesCount === 0}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                          >
                            {isRunning ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                            {isRunning ? "Coletando…" : "Coletar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center px-4 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-xs text-slate-500">{competitors.length} concorrentes monitorados</p>
          </div>
        </div>
      )}
    </div>
  );
}
