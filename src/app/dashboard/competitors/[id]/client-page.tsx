"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge, BoolBadge } from "@/components/ui/status-badge";
import { Plus, Pencil, Trash2, ArrowLeft, Play, RefreshCw, Globe, Server, Monitor } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SourceForm, SourceFormValues } from "./source-form";
import Link from "next/link";
import { toast } from "sonner";
import { deleteSource } from "@/app/actions/sources";

type Source = {
  id: string;
  label: string;
  url: string;
  fetcherType: string;
  frequency: string;
  active: boolean;
  _count?: {
    crawlRuns: number;
  };
};

type Competitor = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  sources: Source[];
};

export function CompetitorDetailsClient({ competitor }: { competitor: Competitor }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  const openNewForm = () => {
    setEditingSource(null);
    setIsFormOpen(true);
  };

  const openEditForm = (source: Source) => {
    setEditingSource(source);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta fonte?")) return;
    try {
      await deleteSource(id);
      toast.success("Fonte excluída com sucesso.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir fonte.");
    }
  };

  const getFetcherIcon = (type: string) => {
    if (type === "BROWSER") return <span title="Browser (Playwright)"><Monitor className="h-4 w-4 text-violet-500" /></span>;
    if (type === "API") return <span title="API JSON"><Server className="h-4 w-4 text-emerald-500" /></span>;
    return <span title="HTTP (Cheerio)"><Globe className="h-4 w-4 text-blue-500" /></span>;
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <Link
        href="/dashboard/competitors"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Concorrentes
      </Link>

      <PageHeader
        title={competitor.name}
        description={competitor.website || `Slug: ${competitor.slug}`}
        total={competitor.sources.length}
      >
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nova Fonte
        </button>
      </PageHeader>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {editingSource ? "Editar Fonte" : "Nova Fonte"}
            </DialogTitle>
          </DialogHeader>
          <SourceForm
            competitorId={competitor.id}
            initialData={
              editingSource
                ? {
                    id: editingSource.id,
                    label: editingSource.label,
                    url: editingSource.url,
                    fetcherType: editingSource.fetcherType as any,
                    frequency: editingSource.frequency as any,
                    active: editingSource.active,
                  }
                : undefined
            }
            onSuccess={() => setIsFormOpen(false)}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden mt-6">
        <div className="overflow-x-auto crc-scrollbar" style={{ maxWidth: '100vw' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                {["Descrição", "URL", "Tipo", "Frequência", "Status", "Ação"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {competitor.sources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                    Nenhuma fonte configurada para este concorrente.
                  </td>
                </tr>
              ) : (
                competitor.sources.map((src) => (
                  <tr key={src.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                      {src.label}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 max-w-[300px] truncate">
                      <a href={src.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 hover:underline">
                        {src.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getFetcherIcon(src.fetcherType)}
                        <span className="text-xs text-slate-600 dark:text-slate-300">{src.fetcherType}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {src.frequency}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <BoolBadge value={src.active} labelTrue="Ativo" labelFalse="Inativo" />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(src)}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition"
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(src.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900 p-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/50 dark:hover:text-red-300 transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
