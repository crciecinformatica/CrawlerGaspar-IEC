import { CourseOffer, ChangeType } from "../generated/prisma/client";

export interface ChangeEvent {
  changeType: ChangeType;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
}

/**
 * Compara a nova oferta normalizada com a última salva no banco
 * Retorna lista de mudanças detectadas
 */
export function detectChanges(
  previous: CourseOffer | null,
  current: {
    fullPrice?: number | null;
    discountPrice?: number | null;
    campaignName?: string | null;
    enrollmentOpen?: boolean;
    startDate?: Date | null;
    modality?: string;
  }
): ChangeEvent[] {
  const changes: ChangeEvent[] = [];

  if (!previous) {
    // Primeira vez que este curso aparece
    changes.push({ changeType: "NEW_COURSE" });
    return changes;
  }

  // Mudança de preço
  const prevFull = previous.fullPrice ? Number(previous.fullPrice) : null;
  const currFull = current.fullPrice ?? null;
  if (currFull !== prevFull) {
    if (prevFull === null || currFull === null || Math.abs(currFull - prevFull) > 1) {
      changes.push({
        changeType: "PRICE_CHANGE",
        fieldName: "fullPrice",
        oldValue: prevFull?.toString(),
        newValue: currFull?.toString(),
      });
    }
  }

  // Preço com desconto
  const prevDisc = previous.discountPrice ? Number(previous.discountPrice) : null;
  const currDisc = current.discountPrice ?? null;
  if (currDisc !== prevDisc) {
    if (prevDisc === null || currDisc === null || Math.abs(currDisc - prevDisc) > 1) {
      changes.push({
        changeType: "PRICE_CHANGE",
        fieldName: "discountPrice",
        oldValue: prevDisc?.toString(),
        newValue: currDisc?.toString(),
      });
    }
  }

  // Campanha adicionada
  if (!previous.campaignName && current.campaignName) {
    changes.push({
      changeType: "CAMPAIGN_ADDED",
      fieldName: "campaignName",
      oldValue: undefined,
      newValue: current.campaignName,
    });
  }

  // Campanha removida
  if (previous.campaignName && !current.campaignName) {
    changes.push({
      changeType: "CAMPAIGN_REMOVED",
      fieldName: "campaignName",
      oldValue: previous.campaignName,
      newValue: undefined,
    });
  }

  // Campanha alterada
  if (
    previous.campaignName &&
    current.campaignName &&
    previous.campaignName !== current.campaignName
  ) {
    changes.push({
      changeType: "CAMPAIGN_ADDED",
      fieldName: "campaignName",
      oldValue: previous.campaignName,
      newValue: current.campaignName,
    });
  }

  // Inscrições abertas
  if (!previous.enrollmentOpen && current.enrollmentOpen === true) {
    changes.push({
      changeType: "ENROLLMENT_OPENED",
      fieldName: "enrollmentOpen",
      oldValue: "false",
      newValue: "true",
    });
  }

  // Inscrições fechadas
  if (previous.enrollmentOpen && current.enrollmentOpen === false) {
    changes.push({
      changeType: "ENROLLMENT_CLOSED",
      fieldName: "enrollmentOpen",
      oldValue: "true",
      newValue: "false",
    });
  }

  return changes;
}
