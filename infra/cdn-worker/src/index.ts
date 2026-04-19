/**
 * Cloudflare Worker: cdn.winlab.tw
 *
 * Proxies public reads of our Supabase Storage buckets and puts the Cloudflare
 * edge cache in front of them. Result: repeat views of the same asset never
 * touch Supabase bandwidth.
 *
 * URL shape:
 *   https://cdn.winlab.tw/<bucket>/<object-path>
 *   → origin: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<object-path>
 *
 * Hotlink protection: browser requests with a Referer outside winlab.tw get
 * rejected. Direct hits (no Referer) pass — that covers curl, crawlers, image
 * previews, etc.
 */

export interface Env {
  SUPABASE_PROJECT_REF: string;
  ALLOWED_BUCKETS: string; // comma-separated
  ALLOWED_REFERER_HOSTS: string; // comma-separated
}

const EDGE_TTL_SECONDS = 60 * 60 * 24 * 30;
const BROWSER_CACHE_MAX_AGE = 60 * 60 * 24 * 365;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isAllowedReferer(refererHeader: string | null, allowed: string[]): boolean {
  if (!refererHeader) return true; // direct hit (curl, SSR prefetch, crawlers)
  try {
    const refHost = new URL(refererHeader).hostname.toLowerCase();
    return allowed.some((host) => refHost === host || refHost.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/__healthz") {
      return json(200, { ok: true, ref: env.SUPABASE_PROJECT_REF });
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { error: "method not allowed" });
    }

    const allowedBuckets = env.ALLOWED_BUCKETS.split(",").map((s) => s.trim()).filter(Boolean);
    const allowedReferers = env.ALLOWED_REFERER_HOSTS.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

    if (!isAllowedReferer(request.headers.get("Referer"), allowedReferers)) {
      return json(403, { error: "hotlink denied" });
    }

    // /carousel/foo.webp          -> implicit bucket "announcement-images"
    // /announcement-images/foo.jpg -> explicit bucket
    // /<bucket>/<rest...>
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return json(400, { error: "empty path" });

    let bucket: string;
    let objectPath: string;
    if (allowedBuckets.includes(segments[0])) {
      bucket = segments[0];
      objectPath = segments.slice(1).join("/");
    } else {
      bucket = "announcement-images";
      objectPath = segments.join("/");
    }

    if (!allowedBuckets.includes(bucket)) {
      return json(403, { error: `bucket not allowed: ${bucket}` });
    }
    if (!objectPath) return json(400, { error: "missing object path" });

    const origin = `https://${env.SUPABASE_PROJECT_REF}.supabase.co/storage/v1/object/public/${bucket}/${objectPath}`;
    const cacheKey = new Request(origin, { method: "GET" });
    const cache = caches.default;

    let response = await cache.match(cacheKey);
    if (response) {
      const cached = new Response(response.body, response);
      cached.headers.set("X-CDN-Hit", "hit");
      return cached;
    }

    const originResponse = await fetch(origin, {
      method: "GET",
      cf: {
        cacheEverything: true,
        cacheTtl: EDGE_TTL_SECONDS,
        cacheTtlByStatus: { "200-299": EDGE_TTL_SECONDS, "404": 60, "500-599": 0 },
      },
    });

    if (!originResponse.ok) {
      return new Response(originResponse.body, {
        status: originResponse.status,
        headers: {
          "content-type": originResponse.headers.get("content-type") ?? "text/plain",
          "X-CDN-Hit": "miss-error",
        },
      });
    }

    const headers = new Headers(originResponse.headers);
    headers.set("Cache-Control", `public, max-age=${BROWSER_CACHE_MAX_AGE}, immutable`);
    headers.set("X-CDN-Hit", "miss");
    headers.delete("set-cookie");

    response = new Response(originResponse.body, {
      status: originResponse.status,
      headers,
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
