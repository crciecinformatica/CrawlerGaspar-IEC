"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { createSource, updateSource } from "@/app/actions/sources";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  label: z.string().min(2, "Descrição deve ter pelo menos 2 caracteres"),
  url: z.string().url("URL inválida"),
  fetcherType: z.enum(["HTTP", "BROWSER", "API"]),
  frequency: z.enum(["HOURLY", "DAILY", "WEEKLY"]),
  active: z.boolean(),
});

export type SourceFormValues = z.infer<typeof formSchema>;

interface SourceFormProps {
  competitorId: string;
  initialData?: SourceFormValues & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export function SourceForm({ competitorId, initialData, onSuccess, onCancel }: SourceFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SourceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      label: "",
      url: "",
      fetcherType: "HTTP",
      frequency: "WEEKLY",
      active: true,
    },
  });

  const onSubmit = async (data: SourceFormValues) => {
    setLoading(true);
    try {
      if (isEditing) {
        await updateSource(initialData.id!, data);
        toast.success("Fonte atualizada com sucesso!");
      } else {
        await createSource(competitorId, data);
        toast.success("Fonte criada com sucesso!");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao salvar a fonte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="label" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Descrição
        </label>
        <input
          {...register("label")}
          id="label"
          placeholder="ex: Página de Pós EAD"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
        {errors.label && <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>}
      </div>

      <div>
        <label htmlFor="url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          URL Base
        </label>
        <input
          {...register("url")}
          id="url"
          type="url"
          placeholder="ex: https://www.instituicao.edu.br/pos"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
        {errors.url && <p className="text-red-500 text-xs mt-1">{errors.url.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="fetcherType" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Tipo de Extrator
          </label>
          <select
            {...register("fetcherType")}
            id="fetcherType"
            className="crc-select"
          >
            <option value="HTTP">HTTP (Cheerio)</option>
            <option value="BROWSER">Browser (Playwright)</option>
            <option value="API">API JSON</option>
          </select>
          {errors.fetcherType && <p className="text-red-500 text-xs mt-1">{errors.fetcherType.message}</p>}
        </div>

        <div>
          <label htmlFor="frequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Frequência
          </label>
          <select
            {...register("frequency")}
            id="frequency"
            className="crc-select"
          >
            <option value="HOURLY">Por Hora</option>
            <option value="DAILY">Diária</option>
            <option value="WEEKLY">Semanal</option>
          </select>
          {errors.frequency && <p className="text-red-500 text-xs mt-1">{errors.frequency.message}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          {...register("active")}
          type="checkbox"
          id="active"
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
        />
        <label htmlFor="active" className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Ativo (Coleta habilitada)
        </label>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEditing ? "Salvar Alterações" : "Adicionar Fonte"}
        </button>
      </div>
    </form>
  );
}
