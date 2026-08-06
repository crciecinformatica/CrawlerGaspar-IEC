import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  total?: number;
  children?: ReactNode;
}

export function PageHeader({ title, description, total, children }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        )}
        {total !== undefined && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            {total.toLocaleString("pt-BR")} registro{total !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
