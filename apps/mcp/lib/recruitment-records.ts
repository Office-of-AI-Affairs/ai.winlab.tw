import type {
  Recruitment,
  RecruitmentPrivateDetails,
  RecruitmentSummary,
} from "@/lib/supabase/types";

export function composeRecruitment(
  summary: RecruitmentSummary,
  details?: RecruitmentPrivateDetails | null
): Recruitment {
  return {
    ...summary,
    positions: details?.positions ?? null,
    application_method: details?.application_method ?? null,
    contact: details?.contact ?? null,
    required_documents: details?.required_documents ?? null,
  };
}
