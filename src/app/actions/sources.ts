"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { FetcherType, SourceFrequency } from "@/generated/prisma/client"; // Prisma client generated types

export async function createSource(
  competitorId: string,
  data: {
    label: string;
    url: string;
    fetcherType: string;
    frequency: string;
    active: boolean;
  }
) {
  const source = await prisma.source.create({
    data: {
      competitorId,
      label: data.label,
      url: data.url,
      fetcherType: data.fetcherType as FetcherType,
      frequency: data.frequency as SourceFrequency,
      active: data.active,
    },
  });
  revalidatePath(`/dashboard/competitors/${competitorId}`);
  revalidatePath("/dashboard/competitors");
  return source;
}

export async function updateSource(
  id: string,
  data: {
    label: string;
    url: string;
    fetcherType: string;
    frequency: string;
    active: boolean;
  }
) {
  const source = await prisma.source.update({
    where: { id },
    data: {
      label: data.label,
      url: data.url,
      fetcherType: data.fetcherType as FetcherType,
      frequency: data.frequency as SourceFrequency,
      active: data.active,
    },
  });
  revalidatePath(`/dashboard/competitors/${source.competitorId}`);
  revalidatePath("/dashboard/competitors");
  return source;
}

export async function deleteSource(id: string) {
  const source = await prisma.source.findUnique({
    where: { id },
    include: {
      _count: {
        select: { crawlRuns: true }
      }
    }
  });

  if (!source) throw new Error("Fonte não encontrada");
  if (source._count.crawlRuns > 0) {
    throw new Error("Não é possível excluir uma fonte que possui execuções de crawler vinculadas. Desative-a em vez disso.");
  }

  await prisma.source.delete({
    where: { id },
  });
  revalidatePath(`/dashboard/competitors/${source.competitorId}`);
  revalidatePath("/dashboard/competitors");
}
