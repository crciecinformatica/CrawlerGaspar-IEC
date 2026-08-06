"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  CheckCircle2, AlertCircle, Clock, RefreshCw, ChevronLeft, ChevronRight, Eye, ExternalLink, Hash
} from "lucide-react";

interface CrawlRun {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  offersFound: number;
  offersNew: number;
  offersChanged: number;
  errorMessage?: string;
  contentHash?: string;
  source: {
    label: string;
    url: string;
    competitor: { name: string; slug: string };
  };
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  SUCCESS: {
    label: "Sucesso",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  ERROR: {
    label: "Erro",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  RUNNING: {
    label: "Executando",
    icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  PENDING: {
    label: "Pendente",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  PARTIAL: {
    label: "Parcial",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
};

export default function RunsPage() {
  const [runs, setRuns] = useState<CrawlRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<CrawlRun | null>(null);
  const limit = 20;

  async function load(p = 1) {
    setLoading(true);
    const res = await fetch(`/api/runs?page=${p}&limit=${limit}`);
    const data = await res.json();
    setRuns(data.runs ?? []);
    setTotal(data.meta?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function formatDuration(ms?: number) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        title="Execuções"
        description="Histórico de todas as coletas realizadas pelos crawlers."
        total={total}
      >
        <button
          onClick={() => load(page)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </PageHeader>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                {["Concorrente", "Fonte", "Status", "Início", "Duração", "Ação"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <RefreshCw className="h-6 w-6 text-slate-300 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-slate-400">
                    Nenhuma execução registrada. Execute um crawler nas Fontes Monitoradas.
                  </td>
                </tr>
              ) : (
                runs.map((run) => {
                  const cfg = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.PENDING;
                  return (
                    <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                        {run.source.competitor.name}
                      </td>
                      <td className="px-4 py-2.5 max-w-[180px]">
                        <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{run.source.label}</p>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold ${cfg.className}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {new Date(run.startedAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {formatDuration(run.durationMs)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRun(run)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <p className="text-xs text-slate-500">{total} execuções registradas</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-500 min-w-[60px] text-center tabular-nums">
              {page} / {pages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    Detalhes da Execução
                  </h3>
                  <p className="text-sm text-slate-500">{selectedRun.source.competitor.name}</p>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold ${STATUS_CONFIG[selectedRun.status]?.className || STATUS_CONFIG.PENDING.className}`}>
                  {STATUS_CONFIG[selectedRun.status]?.icon || STATUS_CONFIG.PENDING.icon}
                  {STATUS_CONFIG[selectedRun.status]?.label || STATUS_CONFIG.PENDING.label}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Início</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{new Date(selectedRun.startedAt).toLocaleString("pt-BR")}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Duração</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDuration(selectedRun.durationMs)}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Ofertas Encontradas</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{selectedRun.offersFound}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-1">Novas / Alteradas</span>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span className="text-emerald-500">+{selectedRun.offersNew}</span> / <span className="text-amber-500">~{selectedRun.offersChanged}</span>
                  </p>
                </div>
              </div>

              {selectedRun.errorMessage && (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-lg p-4 mb-6">
                  <h4 className="text-xs font-semibold text-red-800 dark:text-red-400 uppercase tracking-wider mb-2">Mensagem de Erro</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 whitespace-pre-wrap font-mono break-all">{selectedRun.errorMessage}</p>
                </div>
              )}
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <a href={selectedRun.source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Acessar Fonte Original
                </a>
                <button onClick={() => setSelectedRun(null)} className="px-4 py-2 text-sm font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg transition">
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
