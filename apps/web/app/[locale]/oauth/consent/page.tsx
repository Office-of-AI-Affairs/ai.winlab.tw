import { PageShell } from "@/components/shared/page-shell";
import { Card } from "@/components/ui/card";
import { getConsentRequest } from "@/lib/auth/consent";
import { requireViewer } from "@/lib/auth/viewer";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import type { Metadata } from "next";
import { ConsentActions } from "./consent-actions";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const dict = await getDictionary(isLocale(raw) ? raw : defaultLocale);
  return { title: dict.auth.consent.metaTitle, robots: { index: false, follow: false } };
}

// Better Auth sends MCP clients here after sign-in, with a signed query.
export default async function ConsentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = (await getDictionary(locale)).auth.consent;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of [value].flat()) if (item !== undefined) query.append(key, item);
  }
  await requireViewer();
  const request = await getConsentRequest(query.toString());

  return (
    <PageShell tone="auth">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Card className="p-8 flex flex-col gap-5">
          {request ? (
            <>
              <h1 className="text-2xl font-bold">{t.title.replace("{name}", request.name)}</h1>
              {request.host && <p className="text-sm text-muted-foreground">{t.host.replace("{host}", request.host)}</p>}
              <ConsentActions />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{t.expired}</h1>
              <p className="text-sm text-muted-foreground">{t.expiredHint}</p>
            </>
          )}
        </Card>
      </div>
    </PageShell>
  );
}
