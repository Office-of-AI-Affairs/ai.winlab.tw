import { getOrganizationMembers } from "@/app/[locale]/introduction/data";
import { AppLink } from "@/components/shared/app-link";
import { Button } from "@/components/ui/button";
import { isExternalImage, resolveImageSrc } from "@/lib/utils";
import { type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionary";
import { localizedPath } from "@/lib/i18n/routing";
import Image from "next/image";
import Link from "next/link";

export async function HomePartners({
  t,
  locale,
}: {
  t: Dictionary["home"];
  locale: Locale;
}) {
  const all = await getOrganizationMembers();
  const partners = all.filter(
    (member) => member.category === "industry" || member.category === "legal_entity",
  );

  if (partners.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/40 py-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <h2 className="text-2xl font-bold border-l-4 border-primary pl-3">{t.partnersHeading}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {partners.map((partner) => {
            const logo = (
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-background border border-border">
                <Image
                  src={resolveImageSrc(partner.image)}
                  alt={partner.name}
                  fill
                  className="object-contain p-3 grayscale hover:grayscale-0 transition-[filter] duration-200"
                  unoptimized={isExternalImage(partner.image)}
                />
              </div>
            );

            return (
              <div key={partner.id} className="flex flex-col items-center gap-2">
                {partner.website ? (
                  <AppLink href={partner.website} className="w-full">
                    {logo}
                  </AppLink>
                ) : (
                  logo
                )}
                <p className="text-xs text-muted-foreground text-center line-clamp-1">
                  {partner.name}
                </p>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center">
          <Button asChild variant="secondary" className="px-12 text-lg">
            <Link href={localizedPath("/introduction?tab=industry", locale)}>{t.explore}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
