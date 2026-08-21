import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CompetitorDetailsClient } from "./client-page";

export default async function CompetitorDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const competitor = await prisma.competitor.findUnique({
    where: { id },
    include: {
      sources: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { crawlRuns: true },
          },
        },
      },
    },
  });

  if (!competitor) {
    notFound();
  }

  return <CompetitorDetailsClient competitor={competitor} />;
}
