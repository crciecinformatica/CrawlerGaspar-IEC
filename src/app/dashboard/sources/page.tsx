"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Globe, Play, RefreshCw, AlertCircle, CheckCircle2, Clock } from "lucide-react";

interface Source {
  id: string;
  label: string;
  url: string;
  fetcherType: string;
  frequency: string;
  active: boolean;
  competitor: { name: string; slug: string };
  crawlRuns: {
    id: string;
    status: string;
    startedAt: string;
    finishedAt?: string;
    durationMs?: number;
    offersFound: number;
    offersNew: number;
    offersChanged: number;
    errorMessage?: string;
  }[];
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set());

  async function loadSources() {
    setLoading(true);
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data.sources ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function triggerCrawl(sourceId: string) {
    setRunningIds((prev) => new Set(prev).add(sourceId));
    try {
      await fetch("/api/crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId }),
      });
      await loadSources();
    } finally {
      setRunningIds((prev) => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }

  function statusIcon(status?: string) {
    if (!status) return <Clock className="h-3.5 w-3.5 text-slate-400" />;
    if (status === "SUCCESS") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    if (status === "ERROR") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    if (status === "RUNNING") return <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
    return <Clock className="h-3.5 w-3.5 text-amber-400" />;
  }

  function formatDuration(ms?: number) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  const fetcherColors: Record<string, string> = {
    BROWSER: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
    HTTP: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    API: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        title="Fontes Monitoradas"
        description="URLs e endpoints configurados para coleta de dados dos concorrentes."
        total={sources.length}
      >
        <button
          onClick={() =>
            fetch("/api/crawl/run", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ all: true }),
            }).then(loadSources)
          }
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Play className="h-4 w-4" />
          Executar Todos
        </button>
      </PageHeader>

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
                  {["Fonte", "Concorrente", "Tipo", "Freq.", "Último Run", "Duração", "Ofertas", "Ação"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                {sources.map((src) => {
                  const lastRun = src.crawlRuns[0];
                  const isRunning = runningIds.has(src.id);
                  return (
                    <tr key={src.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{src.label}</p>
                        <a href={src.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 truncate mt-0.5">
                          <Globe className="h-3 w-3 shrink-0" />
                          <span className="truncate">{src.url}</span>
                        </a>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                        {src.competitor.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${fetcherColors[src.fetcherType] ?? ""}`}>
                          {src.fetcherType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                        {src.frequency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {statusIcon(lastRun?.status)}
                          <span className={`text-xs ${lastRun?.status === "ERROR" ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>
                            {lastRun
                              ? lastRun.status === "ERROR"
                                ? (lastRun.errorMessage?.slice(0, 40) ?? "Erro")
                                : new Date(lastRun.startedAt).toLocaleString("pt-BR")
                              : "Nunca executado"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatDuration(lastRun?.durationMs)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs tabular-nums">
                        {lastRun ? (
                          <span className="text-slate-600 dark:text-slate-300">
                            {lastRun.offersFound} encontradas{" "}
                            {lastRun.offersNew > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">+{lastRun.offersNew}</span>
                            )}
                            {lastRun.offersChanged > 0 && (
                              <span className="ml-1 text-amber-600 dark:text-amber-400">~{lastRun.offersChanged}</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => triggerCrawl(src.id)}
                          disabled={isRunning}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 dark:hover:bg-blue-950 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                          {isRunning ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Play className="h-3 w-3" />
                          )}
                          {isRunning ? "Executando…" : "Executar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center px-4 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
            <p className="text-xs text-slate-500 dark:text-slate-400">{sources.length} fontes configuradas</p>
          </div>
        </div>
      )}
    </div>
  );
}
