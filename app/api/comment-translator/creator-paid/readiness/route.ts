import { NextResponse } from "next/server";
import { readCommentTranslatorCreatorPaidReadiness } from "@/lib/comment-translator-creator-paid-readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    readCommentTranslatorCreatorPaidReadiness(process.env),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
