"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import { toast } from "sonner";
import { createCompetitor, updateCompetitor } from "@/app/actions/competitors";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z.string().min(2, "Slug deve ter pelo menos 2 caracteres").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  website: z.string().url("URL inválida").or(z.literal("")),
  active: z.boolean(),
});

export type CompetitorFormValues = z.infer<typeof formSchema>;

interface CompetitorFormProps {
  initialData?: CompetitorFormValues & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export function CompetitorForm({ initialData, onSuccess, onCancel }: CompetitorFormProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!initialData?.id;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompetitorFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: "",
      slug: "",
      website: "",
      active: true,
    },
  });

  const onSubmit = async (data: CompetitorFormValues) => {
    setLoading(true);
    const payload = {
      ...data,
      website: data.website === "" ? null : data.website,
    };
    try {
      if (isEditing) {
        await updateCompetitor(initialData.id!, payload);
        toast.success("Concorrente atualizado com sucesso!");
      } else {
        await createCompetitor(payload);
        toast.success("Concorrente criado com sucesso!");
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Ocorreu um erro ao salvar o concorrente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Nome da Instituição
        </label>
        <input
          {...register("name")}
          id="name"
          placeholder="ex: PUC Minas"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Slug (Identificador Único)
        </label>
        <input
          {...register("slug")}
          id="slug"
          placeholder="ex: puc-minas"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
        {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
      </div>

      <div>
        <label htmlFor="website" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          Website (Opcional)
        </label>
        <input
          {...register("website")}
          id="website"
          placeholder="ex: https://www.pucminas.br"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm"
        />
        {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>}
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
          {isEditing ? "Salvar Alterações" : "Criar Concorrente"}
        </button>
      </div>
    </form>
  );
}
