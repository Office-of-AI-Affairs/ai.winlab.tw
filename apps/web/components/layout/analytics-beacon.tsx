"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";
import { isExcludedPath } from "@/lib/analytics/schema";
import { useLocale } from "@/lib/i18n/locale-provider";

const BEACON_URL = "/api/beacon";
const CORE_WEB_VITALS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);

function analyticsDisabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "1";
}

function viewportBucket(): "mobile" | "desktop" {
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

/**
 * Fire-and-forget POST to `/api/beacon` — `sendBeacon` first (survives page
 * unload, which matters for the last pageview/web-vital before navigation),
 * falling back to `fetch(..., { keepalive: true })` for the rare browser
 * without `sendBeacon` or when it refuses the payload. Both paths are
 * wrapped so a blocked/unreachable endpoint (ad blockers, offline, the
 * Sensorium collector being down) can never throw into caller code.
 */
function send(payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(BEACON_URL, blob)) return;
    }

    void fetch(BEACON_URL, {
      method: "POST",
      body,
      keepalive: true,
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  } catch {
    // Best-effort visitor analytics — never allowed to affect the page.
  }
}

/**
 * First-party, cookieless pageview + web-vitals beacon. Mounted once in the
 * root layout (`app/[locale]/layout.tsx`); see `app/api/beacon/route.ts` for
 * the event schema this feeds into Sensorium.
 *
 * Public pages are ISR/static and served straight from the CDN, so they
 * never hit the Next.js server and produce no server-side telemetry — this
 * is the client-side signal that fills that gap.
 *
 * Kill switch: set `NEXT_PUBLIC_ANALYTICS_DISABLED=1` to disable both the
 * pageview and web-vitals reporting below without a code change.
 */
export function AnalyticsBeacon() {
  const pathname = usePathname();
  const locale = useLocale();
  const lastReportedPath = useRef<string | null>(null);

  // Pageview on initial load and every App Router (soft) navigation.
  // `usePathname` is the only reliable trigger for soft navigations — there's
  // no `popstate`/full page load to hang a listener off.
  useEffect(() => {
    if (analyticsDisabled()) return;
    if (!pathname || pathname === lastReportedPath.current) return;
    lastReportedPath.current = pathname;

    const search = window.location.search;
    if (isExcludedPath(pathname, search)) return;

    const params = new URLSearchParams(search);
    send({
      type: "pageview",
      path: pathname,
      referrer: document.referrer || undefined,
      utm_source: params.get("utm_source") ?? undefined,
      utm_medium: params.get("utm_medium") ?? undefined,
      utm_campaign: params.get("utm_campaign") ?? undefined,
      locale,
      viewport: viewportBucket(),
    });
  }, [pathname, locale]);

  useReportWebVitals((metric) => {
    if (analyticsDisabled()) return;
    if (!CORE_WEB_VITALS.has(metric.name)) return;
    if (isExcludedPath(window.location.pathname, window.location.search)) return;

    send({
      type: "webvital",
      name: metric.name,
      value: metric.value,
      rating: (metric as { rating?: string }).rating,
      path: window.location.pathname,
    });
  });

  return null;
}
