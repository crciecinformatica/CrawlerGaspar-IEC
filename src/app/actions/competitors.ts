"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCompetitor(data: {
  name: string;
  slug: string;
  website: string | null;
  active: boolean;
}) {
  const competitor = await prisma.competitor.create({
    data,
  });
  revalidatePath("/dashboard/competitors");
  return competitor;
}

export async function updateCompetitor(
  id: string,
  data: {
    name: string;
    slug: string;
    website: string | null;
    active: boolean;
  }
) {
  const competitor = await prisma.competitor.update({
    where: { id },
    data,
  });
  revalidatePath("/dashboard/competitors");
  revalidatePath(`/dashboard/competitors/${id}`);
  return competitor;
}

export async function deleteCompetitor(id: string) {
  // Verify if it has related sources or offers first
  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      _count: {
        select: { sources: true, offers: true }
      }
    }
  });

  if (!competitor) throw new Error("Concorrente não encontrado");
  if (competitor._count.sources > 0 || competitor._count.offers > 0) {
    throw new Error("Não é possível excluir um concorrente que possui fontes ou ofertas vinculadas. Desative-o em vez disso.");
  }

  await prisma.competitor.delete({
    where: { id },
  });
  revalidatePath("/dashboard/competitors");
}
