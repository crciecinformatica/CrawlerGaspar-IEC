// ─────────────────────────────────────────────────────────────
// StatusBadge — aceita string ("Ativo"/"Inativo") ou número
// (1=Aberto, 2=Em andamento, 3=Pendente, 4=Concluído, 5=Cancelado)
// ─────────────────────────────────────────────────────────────

const STATUS_NUMBER_MAP: Record<
  number,
  { label: string; classes: string }
> = {
  1: {
    label: "Aberto",
    classes:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  2: {
    label: "Em andamento",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  3: {
    label: "Pendente",
    classes:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  4: {
    label: "Concluído",
    classes:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  5: {
    label: "Cancelado",
    classes:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

const STATUS_STRING_MAP: Record<string, string> = {
  ativo: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  inativo:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  sincronizado:
    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  alerta:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  erro: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function StatusBadge({ value }: { value: string | number }) {
  if (typeof value === "number") {
    const config = STATUS_NUMBER_MAP[value];
    if (!config) return null;
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${config.classes}`}
      >
        {config.label}
      </span>
    );
  }

  const classes =
    STATUS_STRING_MAP[value.toLowerCase()] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${classes}`}
    >
      {value}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// PrioridadeBadge — 1=Baixa, 2=Média, 3=Alta, 4=Crítica, 5=Urgente
// ─────────────────────────────────────────────────────────────

const PRIORIDADE_MAP: Record<
  number,
  { label: string; classes: string }
> = {
  1: {
    label: "Baixa",
    classes:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  2: {
    label: "Média",
    classes:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
  3: {
    label: "Alta",
    classes:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  4: {
    label: "Crítica",
    classes: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
  5: {
    label: "Urgente",
    classes:
      "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
};

export function PrioridadeBadge({ value }: { value: number }) {
  const config = PRIORIDADE_MAP[value];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${config.classes}`}
    >
      {config.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// BoolBadge — true/false → verde/cinza
// ─────────────────────────────────────────────────────────────

export function BoolBadge({
  value,
  labelTrue = "Sim",
  labelFalse = "Não",
}: {
  value: boolean;
  labelTrue?: string;
  labelFalse?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${
        value
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {value ? labelTrue : labelFalse}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// CategoriaBadge — Administrativa / Backup / Academica / etc.
// ─────────────────────────────────────────────────────────────

const CATEGORIA_MAP: Record<string, string> = {
  administrativa:
    "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  backup:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  academica:
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  academica_ead:
    "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  presencial:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  online:
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  flex: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  // Modality enum values
  ead: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  hibrido:
    "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
  desconhecido:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};


export function CategoriaBadge({ value }: { value: string }) {
  const classes =
    CATEGORIA_MAP[value.toLowerCase().replace(/[\s-]/g, "_")] ??
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${classes}`}
    >
      {value}
    </span>
  );
}
