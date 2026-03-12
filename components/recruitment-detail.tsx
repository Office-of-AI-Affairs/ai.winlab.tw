import type {
  Recruitment,
  RecruitmentPositionType,
} from "@/lib/supabase/types";
import { isExternalImage } from "@/lib/utils";
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
import Image from "next/image";
import Link from "next/link";

type RecruitmentDetailProps = {
  recruitment: Recruitment;
  backHref: string;
  backLabel: string;
};

const POSITION_TYPE_LABELS: Record<RecruitmentPositionType, string> = {
  full_time: "全職",
  internship: "實習",
  part_time: "兼職",
  remote: "遠端",
};

export function RecruitmentDetail({
  recruitment,
  backHref,
  backLabel,
}: RecruitmentDetailProps) {
  const isExpired =
    recruitment.end_date && new Date(recruitment.end_date) < new Date();

  const positionCount = recruitment.positions?.length ?? 0;

  return (
    <div>
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </Link>

      {/* Cover image */}
      {recruitment.image && (
        <div className="relative w-full max-h-80 aspect-video rounded-lg overflow-hidden mb-8">
          <Image
            src={recruitment.image}
            alt={recruitment.title}
            fill
            className="object-cover"
            unoptimized={isExternalImage(recruitment.image)}
          />
        </div>
      )}

      {/* Title section */}
      <div className="max-w-6xl mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance mb-4">
          {recruitment.title}
        </h1>
        <div className="flex items-center gap-2 text-base text-muted-foreground">
          {recruitment.link && (
            <>
              <a
                href={recruitment.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                前往網站
              </a>
              <span>&middot;</span>
            </>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {recruitment.start_date} ~ {recruitment.end_date ?? "截止日未定"}
          </span>
          {isExpired && (
            <span className="ml-1.5 px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              已截止
            </span>
          )}
          <span>&middot;</span>
          <span className="inline-flex items-center gap-1.5">
            <Briefcase className="w-4 h-4" />
            {positionCount > 0 ? `${positionCount} 個職缺` : "暫無職缺"}
          </span>
        </div>
      </div>

      <hr className="mb-8" />

      {/* Company description */}
      {recruitment.company_description && (
        <div className="mb-10">
          <p className="whitespace-pre-line text-base text-muted-foreground leading-relaxed">
            {recruitment.company_description}
          </p>
        </div>
      )}

      {/* Positions list */}
      {recruitment.positions && recruitment.positions.length > 0 && (
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
                  {POSITION_TYPE_LABELS[position.type]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {position.count} 名
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
                  <span><strong>薪資範圍：</strong>{position.salary}</span>
                </div>
              )}

              {/* Responsibilities */}
              {position.responsibilities && (
                <div className="border-l-2 border-primary/30 pl-4 space-y-1.5 pt-2 pb-2">
                  <h3 className="text-base font-bold">
                    工作內容
                  </h3>
                  <p className="whitespace-pre-line text-sm">
                    {position.responsibilities}
                  </p>
                </div>
              )}

              {/* Requirements */}
              {position.requirements && (
                <div className="border-l-2 border-primary/30 pl-4 space-y-1.5 pt-2 pb-2">
                  <h3 className="text-base font-bold">
                    必備條件
                  </h3>
                  <p className="whitespace-pre-line text-sm">
                    {position.requirements}
                  </p>
                </div>
              )}

              {/* Nice-to-have */}
              {position.nice_to_have && (
                <div className="border-l-2 border-primary/30 pl-4 space-y-1.5 pt-2 pb-2">
                  <h3 className="text-base font-bold">
                    加分條件
                  </h3>
                  <p className="whitespace-pre-line text-sm">
                    {position.nice_to_have}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Application method */}
      {recruitment.application_method &&
        (recruitment.application_method.email ||
          recruitment.application_method.url ||
          recruitment.application_method.other) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">應徵方式</h2>
            <div className="space-y-2 text-sm">
              {recruitment.application_method.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`mailto:${recruitment.application_method.email}`}
                    className="hover:underline"
                  >
                    {recruitment.application_method.email}
                  </a>
                </div>
              )}
              {recruitment.application_method.url && (
                <div className="flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={recruitment.application_method.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {recruitment.application_method.url}
                  </a>
                </div>
              )}
              {recruitment.application_method.other && (
                <p className="text-muted-foreground">
                  {recruitment.application_method.other}
                </p>
              )}
            </div>
          </div>
        )}

      {/* Contact section */}
      {recruitment.contact &&
        (recruitment.contact.name ||
          recruitment.contact.email ||
          recruitment.contact.phone) && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-3">聯絡窗口</h2>
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
                  <a
                    href={`mailto:${recruitment.contact.email}`}
                    className="hover:underline"
                  >
                    {recruitment.contact.email}
                  </a>
                </div>
              )}
              {recruitment.contact.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <a
                    href={`tel:${recruitment.contact.phone}`}
                    className="hover:underline"
                  >
                    {recruitment.contact.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Required documents */}
      {recruitment.required_documents && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">應備文件</h2>
          <p className="whitespace-pre-line text-base text-muted-foreground">
            {recruitment.required_documents}
          </p>
        </div>
      )}
    </div>
  );
}
