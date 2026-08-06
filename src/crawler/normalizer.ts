/**
 * Normaliza preço no formato brasileiro para Float
 * Exemplos: "R$ 4.500,00" → 4500, "De R$ 2.967,30 por R$ 1.438,20" → 1438.20
 * Se a string contém múltiplos valores, retorna o MENOR (preço promocional/desconto)
 */
export function normalizePrice(raw?: string): number | undefined {
  if (!raw) return undefined;

  // Extrair todos os valores R$ da string
  const allMatches = raw.match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/gi);
  
  if (allMatches && allMatches.length > 0) {
    const values = allMatches.map((m) => {
      const cleaned = m.replace(/[^\d,]/g, "").replace(",", ".");
      return parseFloat(cleaned);
    }).filter((v) => !isNaN(v) && v > 0);

    if (values.length === 0) return undefined;
    
    // Se tem padrão "De X por Y", retornar o menor (desconto)
    if (raw.match(/[Dd]e\s+R\$.*(?:por|→)/)) {
      return Math.min(...values);
    }
    
    // Se temos parcela (NNx R$ XX), não confundir com preço total
    const installmentMatch = raw.match(/(\d+)\s*[xX×]\s*(?:de\s*)?R\$\s*([\d.,]+)/);
    if (installmentMatch) {
      // Filtrar o valor da parcela e retornar preço à vista se existir
      const installmentValue = parseFloat(
        installmentMatch[2].replace(/\./g, "").replace(",", ".")
      );
      const nonInstallmentValues = values.filter((v) => Math.abs(v - installmentValue) > 1);
      if (nonInstallmentValues.length > 0) {
        // Retornar o menor valor não-parcela (preço com desconto/à vista)
        return Math.min(...nonInstallmentValues);
      }
      // Se só temos a parcela, calcular o total
      const numInstallments = parseInt(installmentMatch[1]);
      return numInstallments * installmentValue;
    }

    // Caso geral: retornar o primeiro valor encontrado
    return values[0];
  }

  // Fallback: limpar e parsear como antes
  let cleaned = raw.replace(/[^\d,.]/g, "");

  // Formato BR: 1.234,56 → 1234.56
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const value = parseFloat(cleaned);
  if (isNaN(value) || value <= 0) return undefined;
  return value;
}

/**
 * Extrai preço cheio (antes do desconto) de strings com padrão "De R$ X por R$ Y"
 */
export function extractFullPrice(raw?: string): number | undefined {
  if (!raw) return undefined;
  
  const allMatches = raw.match(/R\$\s*\d{1,3}(?:\.\d{3})*,\d{2}/gi);
  if (!allMatches || allMatches.length < 2) return undefined;
  
  const values = allMatches.map((m) => {
    const cleaned = m.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(cleaned);
  }).filter((v) => !isNaN(v) && v > 0);

  if (values.length < 2) return undefined;
  
  // Se tem padrão "De X por Y", retornar o maior (preço cheio)
  if (raw.match(/[Dd]e\s+R\$.*(?:por|→)/)) {
    return Math.max(...values);
  }
  
  return undefined;
}

/**
 * Extrai número de parcelas de strings como "12x de R$ 150" ou "em até 24 parcelas"
 */
export function normalizeInstallments(raw?: string): { installments?: number; installmentValue?: number } {
  if (!raw) return {};

  const match = raw.match(/(\d+)\s*[xX×]\s*(?:de\s*)?R?\$?\s*([\d.,]+)/);
  if (match) {
    return {
      installments: parseInt(match[1]),
      installmentValue: normalizePrice(`R$ ${match[2]}`),
    };
  }

  // "em até 12x"
  const countMatch = raw.match(/(\d+)\s*[xX×]/);
  if (countMatch) {
    return { installments: parseInt(countMatch[1]) };
  }

  return {};
}

/**
 * Normaliza modalidade para enum canônico
 */
export type ModalityEnum = "EAD" | "PRESENCIAL" | "HIBRIDO" | "DESCONHECIDO";

export function normalizeModality(raw?: string): ModalityEnum {
  if (!raw) return "DESCONHECIDO";

  const lower = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  if (/(100%\s*online|ead|a\s*distancia|online|virtual|digital)/.test(lower)) {
    return "EAD";
  }
  if (/(presencial|campus|sede|in.loco)/.test(lower)) {
    return "PRESENCIAL";
  }
  if (/(hibrido|hybrid|flex|semipresencial|misto)/.test(lower)) {
    return "HIBRIDO";
  }

  return "DESCONHECIDO";
}

/**
 * Extrai duração em meses de strings como "18 meses", "1 ano e meio", "360 horas"
 */
export function normalizeDuration(raw?: string): number | undefined {
  if (!raw) return undefined;

  const lower = raw.toLowerCase();

  // "X meses"
  const monthMatch = lower.match(/(\d+)\s*m[eê]s/);
  if (monthMatch) return parseInt(monthMatch[1]);

  // "X anos"
  const yearMatch = lower.match(/(\d+)\s*ano/);
  if (yearMatch) return parseInt(yearMatch[1]) * 12;

  // "X semestres"
  const semMatch = lower.match(/(\d+)\s*semestre/);
  if (semMatch) return parseInt(semMatch[1]) * 6;

  return undefined;
}

/**
 * Extrai carga horária em horas
 */
export function normalizeWorkload(raw?: string): number | undefined {
  if (!raw) return undefined;

  const match = raw.match(/(\d+)\s*h/i);
  if (match) return parseInt(match[1]);

  return undefined;
}

/**
 * Parseia data em português para Date
 * Exemplos: "01/03/2025", "março de 2025", "mar/25"
 */
export function normalizeDate(raw?: string): Date | undefined {
  if (!raw) return undefined;

  // dd/mm/yyyy
  const brDate = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brDate) {
    return new Date(`${brDate[3]}-${brDate[2].padStart(2, "0")}-${brDate[1].padStart(2, "0")}`);
  }

  // yyyy-mm-dd
  const isoDate = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return new Date(raw);

  // "março de 2025", "março 2025"
  const monthNames: Record<string, string> = {
    janeiro: "01", fevereiro: "02", março: "03", abril: "04",
    maio: "05", junho: "06", julho: "07", agosto: "08",
    setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
  };

  const lower = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [name, num] of Object.entries(monthNames)) {
    const norm = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lower.includes(norm)) {
      const yearMatch = lower.match(/(\d{4})/);
      if (yearMatch) return new Date(`${yearMatch[1]}-${num}-01`);
    }
  }

  return undefined;
}

/**
 * Gera chave estável para identificar um curso de um concorrente
 */
export function generateCourseKey(competitorSlug: string, title: string): string {
  const normalized = `${competitorSlug}::${title}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9:]/g, "-")
    .replace(/-+/g, "-");
  return normalized.slice(0, 200);
}

/**
 * Detecta se o preço está oculto (precisa de cadastro/contato)
 */
export function detectHiddenPrice(text: string): boolean {
  const lower = text.toLowerCase();
  return /(consulte|sob\s*consulta|entre\s*em\s*contato|solicite|preencha|formulario)/.test(lower);
}

/**
 * Classifica área do curso baseado no título
 */
export function inferArea(title: string): string | undefined {
  const lower = title.toLowerCase();

  if (/(direito|jurídic|tributár|trabalhista|civil|penal)/.test(lower)) return "Direito";
  if (/(saúde|enferma|psico|nutri|fisio|medic|farmac|odonto)/.test(lower)) return "Saúde";
  if (/(gestão|administr|negócios|mba|empreend|logística|supply)/.test(lower)) return "Negócios";
  if (/(tecnologia|software|dados|data|ti |tec\.inf|sistema|cyber|ia |intelig)/.test(lower)) return "Tecnologia";
  if (/(educação|pedagog|docênc|ead|ensino|escola|licenciat)/.test(lower)) return "Educação";
  if (/(engenharia|civil|mecânic|elétric|produção|ambiental|industrial)/.test(lower)) return "Engenharia";
  if (/(marketing|comunicação|publicidade|mídia|relações|social media)/.test(lower)) return "Marketing";
  if (/(finanças|financeiro|contab|auditoria|banc|invest|economia)/.test(lower)) return "Finanças";
  if (/(rh|recursos humanos|gestão de pessoas|liderança|coaching)/.test(lower)) return "RH";

  return "Outros";
}
