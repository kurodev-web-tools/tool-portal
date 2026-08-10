import { readCommentTranslatorCreatorSafeHistoryAction } from "@/app/tools/comment-translator/history-actions";
import { serializeCommentTranslatorCreatorSafeHistoryCsv } from "@/lib/comment-translator-creator-history-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await readCommentTranslatorCreatorSafeHistoryAction();
    if (result.status !== "ready" || !Array.isArray(result.rows)) return unavailableResponse();
    const csv = serializeCommentTranslatorCreatorSafeHistoryCsv(result.rows);
    if (csv === null) return unavailableResponse();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="comment-translator-safe-history.csv"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return unavailableResponse();
  }
}

function unavailableResponse() {
  return new Response("Safe history export unavailable.", {
    status: 503,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
