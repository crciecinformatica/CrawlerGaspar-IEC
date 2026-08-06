"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { CategoriaBadge } from "@/components/ui/status-badge";
import { RefreshCw, Download, Filter, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface Offer {
  id: string;
  title: string;
  area: string | null;
  modality: string;
  fullPrice: number | null;
  discountPrice: number | null;
  installments: number | null;
  installmentValue: number | null;
  campaignName: string | null;
  enrollmentOpen: boolean;
  isPriceHidden: boolean;
  confidenceScore: number;
  sourceUrl: string;
  scrapedAt: string;
  competitor: { name: string; slug: string };
}

interface FilterState {
  competitorId: string;
  modality: string;
  area: string;
  campaign: string;
}

function formatBRL(n: number | null | undefined) {
  if (!n) return null;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function CoursesPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    competitorId: "", modality: "", area: "", campaign: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [competitors, setCompetitors] = useState<{ id: string; name: string }[]>([]);
  const limit = 50;

  useEffect(() => {
    fetch("/api/competitors").then((r) => r.json()).then((d) =>
      setCompetitors(d.competitors?.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) ?? [])
    );
  }, []);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (filters.competitorId) params.set("competitorId", filters.competitorId);
      if (filters.modality) params.set("modality", filters.modality);
      if (filters.area) params.set("area", filters.area);
      if (filters.campaign === "true") params.set("campaign", "true");

      const res = await fetch(`/api/offers?${params}`);
      const data = await res.json();
      setOffers(data.offers ?? []);
      setTotal(data.meta?.total ?? 0);
      setLoading(false);
    },
    [filters]
  );

  useEffect(() => {
    setPage(1);
    load(1);
  }, [filters, load]);

  useEffect(() => {
    load(page);
  }, [page, load]);

  function exportCSV() {
    const params = new URLSearchParams();
    if (filters.competitorId) params.set("competitorId", filters.competitorId);
    if (filters.modality) params.set("modality", filters.modality);
    if (filters.area) params.set("area", filters.area);
    if (filters.campaign === "true") params.set("campaign", "true");
    window.open(`/api/export?${params}`, "_blank");
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6">
      <PageHeader
        title="Ofertas de Cursos"
        description="Cursos coletados e normalizados dos concorrentes monitorados."
        total={total}
      >
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
            showFilters
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
              : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <Filter className="h-4 w-4" />
          Filtros
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </PageHeader>

      {/* Filtros */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Concorrente</label>
            <select
              value={filters.competitorId}
              onChange={(e) => setFilters((f) => ({ ...f, competitorId: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Todos</option>
              {competitors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Modalidade</label>
            <select
              value={filters.modality}
              onChange={(e) => setFilters((f) => ({ ...f, modality: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Todas</option>
              <option value="EAD">EAD</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="HIBRIDO">Híbrido</option>
              <option value="DESCONHECIDO">Não identificado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Área</label>
            <input
              type="text"
              placeholder="ex: Direito"
              value={filters.area}
              onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Campanha</label>
            <select
              value={filters.campaign}
              onChange={(e) => setFilters((f) => ({ ...f, campaign: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-300"
            >
              <option value="">Todas</option>
              <option value="true">Com campanha ativa</option>
            </select>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto" style={{ maxWidth: '100vw' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                {["Instituição", "Curso", "Modalidade", "Preço Base", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <RefreshCw className="h-6 w-6 text-slate-300 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                    Nenhuma oferta encontrada. Execute um crawler nas Fontes Monitoradas.
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} onClick={() => setSelectedOffer(offer)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-slate-700 dark:text-slate-300">
                      {offer.competitor.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2" title={offer.title}>
                        {offer.title}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <CategoriaBadge value={offer.modality} />
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {offer.isPriceHidden ? (
                        <span className="text-xs text-slate-400 italic">Sob consulta</span>
                      ) : offer.discountPrice ? (
                        <div>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatBRL(offer.discountPrice)}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                          {formatBRL(offer.fullPrice) ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {offer.campaignName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-700 uppercase tracking-wider dark:bg-amber-950 dark:text-amber-300">
                          PROMO
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 uppercase tracking-wider dark:bg-slate-800 dark:text-slate-400">
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                       <button onClick={(e) => { e.stopPropagation(); setSelectedOffer(offer); }} className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                         Detalhes
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <p className="text-xs text-slate-500">{total.toLocaleString("pt-BR")} ofertas encontradas</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-slate-500 min-w-[70px] text-center tabular-nums">
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
      
      {/* Modal de Detalhes */}
      {selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedOffer(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">{selectedOffer.competitor.name}</p>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{selectedOffer.title}</h3>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Área</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedOffer.area || "Não especificada"}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">Modalidade</p>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedOffer.modality}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Campanha Ativa</p>
                  <p className="font-medium text-amber-600 dark:text-amber-400">{selectedOffer.campaignName || "Nenhuma campanha"}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 mb-6">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Valores e Parcelamento</h4>
                
                {selectedOffer.isPriceHidden ? (
                  <p className="text-slate-600 dark:text-slate-400 italic">Preço sob consulta. Necessário preencher formulário no site.</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 dark:text-slate-400">Preço Original</span>
                      <span className={`font-medium ${selectedOffer.discountPrice ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                        {formatBRL(selectedOffer.fullPrice) || "—"}
                      </span>
                    </div>
                    {selectedOffer.discountPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Preço com Desconto</span>
                        <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                          {formatBRL(selectedOffer.discountPrice)}
                        </span>
                      </div>
                    )}
                    {selectedOffer.installments && selectedOffer.installmentValue && (
                      <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mt-2">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Parcelamento (Sugerido)</span>
                        <span className="font-bold text-blue-700 dark:text-blue-300">
                          {selectedOffer.installments}x de {formatBRL(selectedOffer.installmentValue)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400">Coletado em {new Date(selectedOffer.scrapedAt).toLocaleDateString("pt-BR")}</p>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedOffer(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition">
                    Fechar
                  </button>
                  <a href={selectedOffer.sourceUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                    Acessar Página <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
