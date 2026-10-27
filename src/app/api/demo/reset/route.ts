import { getStorageRepository } from "@/lib/storage/repository";
import { NextResponse } from "next/server";

export async function POST() {
  const repo = getStorageRepository();
  await repo.resetToSeed();
  return NextResponse.json({ success: true, message: "SafeLayer demo state successfully reset to seed." });
}
