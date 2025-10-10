import { NextResponse } from "next/server";
import { prisma } from "@/lib/prismadb";

export async function GET() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const receiptfg = await prisma.receiptfg.findMany({
    where: {
      orderTime: {
        gte: oneWeekAgo,
      },
    },
    orderBy: {
      orderTime: "desc",
    },
  });

  return NextResponse.json(receiptfg);
}