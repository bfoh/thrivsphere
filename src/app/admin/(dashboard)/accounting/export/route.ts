import { getLedger, quarterRange } from "@/lib/queries/accounting";
import { exportFilename, toCsv } from "@/lib/accounting";
import { ForbiddenError, UnauthenticatedError } from "@/lib/authz";

/**
 * The ledger as a CSV download.
 *
 * A route handler rather than a server action, because the browser must
 * receive a file rather than a page. The guard runs inside `getLedger`, which
 * records the export as an `export` action — a download of the whole period is
 * worth distinguishing in the log from simply looking at the page.
 */
export async function GET(request: Request) {
  const raw = Number(new URL(request.url).searchParams.get("q") ?? "0");
  const offset = Number.isInteger(raw) && raw >= 0 && raw <= 3 ? raw : 0;
  const { from, to } = quarterRange(offset);

  let ledger;
  try {
    ledger = await getLedger(from, to, true);
  } catch (err) {
    if (err instanceof UnauthenticatedError) return new Response("Sign in", { status: 401 });
    if (err instanceof ForbiddenError) return new Response("Not permitted", { status: 403 });
    throw err;
  }

  return new Response(toCsv(ledger.entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(from, to)}"`,
      // Financial data: never cached by an intermediary.
      "Cache-Control": "private, no-store",
    },
  });
}
