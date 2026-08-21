"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Globe, Play, RefreshCw, AlertCircle, CheckCircle2, Clock, Eye, ExternalLink } from "lucide-react";

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
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  async function loadSources() {
    const res = await fetch("/api/sources");
    const data = await res.json();
    setSources(data.sources ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSources();
  }, []);

  // Poll while any crawl is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runningIds.size > 0) {
      interval = setInterval(() => {
        loadSources();
      }, 5000); // Check every 5 seconds
    }
    return () => clearInterval(interval);
  }, [runningIds]);

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

  async function triggerAllCrawls() {
    const allIds = sources.map((s) => s.id);
    setRunningIds(new Set(allIds));
    try {
      await fetch("/api/crawl/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      await loadSources();
    } finally {
      setRunningIds(new Set());
    }
  }

  const isAnyRunning = runningIds.size > 0;

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
          onClick={triggerAllCrawls}
          disabled={isAnyRunning}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnyRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isAnyRunning ? "Executando..." : "Executar Todos"}
        </button>
      </PageHeader>

      {loading && sources.length === 0 ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {["Fonte", "Concorrente", "Último Status", "Ações"].map((h) => (
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
                        <div className="flex items-center gap-1.5">
                          {statusIcon(isRunning ? "RUNNING" : lastRun?.status)}
                          <span className={`text-xs ${lastRun?.status === "ERROR" && !isRunning ? "text-red-500" : "text-slate-500 dark:text-slate-400"}`}>
                            {isRunning
                              ? "Executando..."
                              : lastRun
                                ? lastRun.status === "ERROR"
                                  ? "Erro na Coleta"
                                  : new Date(lastRun.startedAt).toLocaleString("pt-BR")
                                : "Nunca executado"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedSource(src)}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Eye className="h-3.5 w-3.5" /> Detalhes
                          </button>
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
                            {isRunning ? "Aguarde…" : "Executar"}
                          </button>
                        </div>
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
      {selectedSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Detalhes da Fonte
                  </h3>
                  <p className="text-sm text-slate-500">{selectedSource.competitor.name}</p>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${fetcherColors[selectedSource.fetcherType] ?? ""}`}>
                  {selectedSource.fetcherType}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Nome (Label)</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedSource.label}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Frequência</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedSource.frequency}</p>
                </div>
              </div>

              {selectedSource.crawlRuns?.[0] && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mb-6">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Última Execução</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Ofertas Encontradas</span>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{selectedSource.crawlRuns[0].offersFound}</p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Novas / Alteradas</span>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                        +{selectedSource.crawlRuns[0].offersNew} <span className="text-amber-500">~{selectedSource.crawlRuns[0].offersChanged}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">Duração</span>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDuration(selectedSource.crawlRuns[0].durationMs)}</p>
                    </div>
                  </div>
                  {selectedSource.crawlRuns[0].errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                      <span className="text-xs text-red-800 dark:text-red-400 font-semibold uppercase block mb-1">Mensagem de Erro</span>
                      <p className="text-xs text-red-600 dark:text-red-300 font-mono break-all">{selectedSource.crawlRuns[0].errorMessage}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <a href={selectedSource.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Acessar URL
                </a>
                <button onClick={() => setSelectedSource(null)} className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg transition">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
