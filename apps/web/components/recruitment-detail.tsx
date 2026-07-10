import { AppLink } from "@/components/app-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApplicationMethodLinks } from "@/lib/recruitment-application-method";
import type {
  Recruitment,
  RecruitmentPositionType,
} from "@winlab/db";
import { isExternalImage, normalizeMultilineText } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/dictionary";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
  Wallet,
} from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Image from "next/image";

type RecruitmentDetailProps = {
  recruitment: Recruitment;
  backHref: string;
  backLabel: string;
  canViewPrivateDetails: boolean;
  t: Dictionary["recruitment"];
};

export function RecruitmentDetail({
  recruitment,
  backHref,
  backLabel,
  canViewPrivateDetails,
  t,
}: RecruitmentDetailProps) {
  const positionTypeLabels: Record<RecruitmentPositionType, string> = {
    full_time: t.positionType.fullTime,
    internship: t.positionType.internship,
    part_time: t.positionType.partTime,
    remote: t.positionType.remote,
  };
  const isExpired =
    recruitment.end_date && new Date(recruitment.end_date) < new Date();

  const positionCount = recruitment.positions?.reduce((sum, p) => sum + (p.count ?? 0), 0) ?? 0;
  const applicationLinks = getApplicationMethodLinks(
    recruitment.application_method,
    recruitment.link,
  );
  const hasApplicationMethod = !!(
    recruitment.application_method?.email ||
    recruitment.application_method?.other ||
    applicationLinks.length > 0
  );

  return (
    <div>
      <AppLink
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </AppLink>

      <div className="grid lg:grid-cols-2 gap-8 mb-8 items-center">
        {recruitment.image && (
          <div className="w-full rounded-lg overflow-hidden bg-muted">
            <AspectRatio ratio={16 / 9}>
              <Image
                src={recruitment.image}
                alt={recruitment.title}
                fill
                className="object-cover"
                unoptimized={isExternalImage(recruitment.image)}
              />
            </AspectRatio>
          </div>
        )}

        <div className={recruitment.image ? "" : "lg:col-span-2"}>
          <h1 className="text-4xl font-extrabold tracking-tight text-balance mb-4">
            {recruitment.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground sm:text-base">
            {applicationLinks.map((link) => (
              <AppLink
                key={`${link.label}-${link.url}`}
                href={link.url}
                className="inline-flex max-w-full items-center gap-1.5 whitespace-normal break-words hover:underline"
              >
                  <ExternalLink className="w-4 h-4" />
                  {link.label}
              </AppLink>
            ))}
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {recruitment.start_date} ~ {recruitment.end_date ?? t.detail.deadlineTbd}
            </span>
            {isExpired && <Badge variant="destructive">{t.detail.closed}</Badge>}
            {canViewPrivateDetails && (
              <span className="inline-flex items-center gap-1.5">
                <Briefcase className="w-4 h-4" />
                {positionCount > 0
                  ? t.detail.positionCount.replace("{count}", String(positionCount))
                  : t.detail.noPositions}
              </span>
            )}
          </div>
        </div>
      </div>

      <hr className="mb-8" />

      {recruitment.company_description && (
        <div className="mb-10">
          <p className="whitespace-pre-line text-base text-muted-foreground leading-relaxed">
            {normalizeMultilineText(recruitment.company_description)}
          </p>
        </div>
      )}

      {canViewPrivateDetails &&
        recruitment.positions &&
        recruitment.positions.length > 0 && (
        <div className="space-y-5 mb-10">
          {recruitment.positions.map((position, index) => (
            <div
              key={index}
              className="rounded-xl border p-6 space-y-4"
            >
              {/* Position header */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-lg">{position.name}</span>
                <span className="px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground">
                  {positionTypeLabels[position.type]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t.detail.positionOpenings.replace("{count}", String(position.count))}
                </span>
                {position.location && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {position.location}
                  </span>
                )}
              </div>

              {/* Salary */}
              {position.salary && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <span><strong>{t.detail.salaryRange}</strong>{position.salary}</span>
                </div>
              )}

              {/* Responsibilities */}
              {position.responsibilities && (
                <div className="space-y-1.5 pt-2">
                  <h3 className="text-base font-bold pb-4">
                    {t.detail.responsibilities}
                  </h3>
                  <p className="whitespace-pre-line text-sm pl-4">
                    {normalizeMultilineText(position.responsibilities)}
                  </p>
                </div>
              )}

              {/* Requirements */}
              {position.requirements && (
                <div className="space-y-1.5 pt-2">
                  <h3 className="text-base font-bold pb-4">
                    {t.detail.requirements}
                  </h3>
                  <p className="whitespace-pre-line text-sm pl-4">
                    {normalizeMultilineText(position.requirements)}
                  </p>
                </div>
              )}

              {/* Nice-to-have */}
              {position.nice_to_have && (
                <div className="space-y-1.5 pt-2">
                  <h3 className="text-base font-bold pb-4">
                    {t.detail.niceToHave}
                  </h3>
                  <p className="whitespace-pre-line text-sm pl-4">
                    {normalizeMultilineText(position.nice_to_have)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!canViewPrivateDetails && (
        <Card className="mt-8 border-dashed">
          <CardHeader className="gap-3">
            <CardTitle className="text-xl">{t.detail.gateTitle}</CardTitle>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t.detail.gateDescription}
            </p>
          </CardHeader>
          <CardContent>
            <AppLink
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium"
            >
              {t.detail.gateCta}
            </AppLink>
          </CardContent>
        </Card>
      )}

      {canViewPrivateDetails && hasApplicationMethod && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">{t.detail.applicationMethod}</h2>
          <div className="space-y-2 text-sm">
            {recruitment.application_method?.email && (
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <AppLink
                  href={`mailto:${recruitment.application_method.email}`}
                  className="hover:underline"
                >
                  {recruitment.application_method.email}
                </AppLink>
              </div>
            )}
            {applicationLinks.map((link) => (
              <div key={`${link.label}-${link.url}`} className="flex items-start gap-1.5">
                <ExternalLink className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <AppLink href={link.url} className="font-medium hover:underline">
                    {link.label}
                  </AppLink>
                </div>
              </div>
            ))}
            {recruitment.application_method?.other && (
              <p className="whitespace-pre-line text-muted-foreground">
                {normalizeMultilineText(recruitment.application_method.other)}
              </p>
            )}
          </div>
        </div>
      )}

      {canViewPrivateDetails &&
        recruitment.contact &&
        (recruitment.contact.name ||
          recruitment.contact.email ||
          recruitment.contact.phone) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">{t.detail.contact}</h2>
            <div className="space-y-2 text-sm">
              {recruitment.contact.name && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{recruitment.contact.name}</span>
                </div>
              )}
              {recruitment.contact.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <AppLink
                    href={`mailto:${recruitment.contact.email}`}
                    className="hover:underline"
                  >
                    {recruitment.contact.email}
                  </AppLink>
                </div>
              )}
              {recruitment.contact.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <AppLink
                    href={`tel:${recruitment.contact.phone}`}
                    className="hover:underline"
                  >
                    {recruitment.contact.phone}
                  </AppLink>
                </div>
              )}
            </div>
          </div>
        )}

      {canViewPrivateDetails && recruitment.required_documents && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">{t.detail.requiredDocs}</h2>
          <p className="whitespace-pre-line text-base text-muted-foreground">
            {normalizeMultilineText(recruitment.required_documents)}
          </p>
        </div>
      )}
    </div>
  );
}
