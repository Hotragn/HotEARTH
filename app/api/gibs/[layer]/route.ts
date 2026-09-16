import { NextRequest } from "next/server";
import {
  buildWmsSnapshotUrl,
  defaultImageryDate,
  getLayerBySlug,
  utcDateString,
} from "@/lib/gibs";

/**
 * GIBS snapshot cache/proxy.
 *
 * GET /api/gibs/[layer]?date=YYYY-MM-DD
 *
 * Fetches one full-globe equirectangular WMS snapshot from NASA GIBS and
 * returns it with long CDN cache headers, keyed by layer + date (the date is
 * part of the URL, so Vercel's CDN caches each day separately). This is the
 * "route-handler cache proxy" pattern from
 * .claude/skills/vercel-compute-architecture: a thin image passthrough that
 * protects GIBS and speeds up users. No keys, no secrets.
 *
 * GIBS daily layers lag real time (~1 day, IMERG ~2), so on a missing/blank
 * day we walk backwards up to 3 days before giving up.
 */

const MAX_FALLBACK_DAYS = 3;

/**
 * A fully transparent "no data yet" PNG at 2048x1024 compresses to a few KB,
 * while real data is 100KB+. Anything under this is treated as blank.
 */
const MIN_VALID_BYTES = 40_000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ layer: string }> }
) {
  const { layer: slug } = await params;
  const layer = getLayerBySlug(slug);
  if (!layer) {
    return Response.json(
      { error: `Unknown layer "${slug}"` },
      { status: 404 }
    );
  }

  const requestedDate =
    request.nextUrl.searchParams.get("date") ?? defaultImageryDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return Response.json(
      { error: "date must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const baseDate = new Date(`${requestedDate}T00:00:00Z`);
  let lastError = "no attempt";

  for (let back = 0; back <= MAX_FALLBACK_DAYS; back++) {
    const date = utcDateString(back, baseDate);
    const upstream = buildWmsSnapshotUrl(layer, date);
    try {
      const res = await fetch(upstream, {
        // Bypass Next's fetch data-cache: images can exceed its 2MB item
        // limit; CDN caching via Cache-Control below does the real work.
        cache: "no-store",
        headers: { Accept: "image/jpeg,image/png,*/*" },
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.startsWith("image/")) {
        // GIBS returns an XML ServiceException for missing dates.
        lastError = `upstream ${res.status} ${contentType}`;
        continue;
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength < MIN_VALID_BYTES) {
        lastError = `blank image (${buf.byteLength} bytes) for ${date}`;
        continue;
      }
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          // One imagery day is immutable once published, cache hard.
          "Cache-Control":
            "public, s-maxage=86400, stale-while-revalidate=172800",
          "X-Gibs-Layer": layer.gibsId,
          "X-Gibs-Date": date,
          "Access-Control-Expose-Headers": "X-Gibs-Layer, X-Gibs-Date",
        },
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return Response.json(
    {
      error: `GIBS returned no usable imagery for ${layer.gibsId} within ${MAX_FALLBACK_DAYS} days of ${requestedDate}`,
      detail: lastError,
    },
    { status: 502 }
  );
}
