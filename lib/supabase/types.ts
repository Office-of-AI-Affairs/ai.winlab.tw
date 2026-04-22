// Domain aliases. Raw row shapes come from ./database.types.ts (generated
// from the live schema); anything that needs the jsonb columns refined —
// recruitment positions, Tiptap content, etc. — lives here as a
// hand-written overlay so jsonb → structured shape is a deliberate cast.

import type { Tables } from "./database.types";

// === Raw row types (1-to-1 with DB) ===
export type ExternalResult = Tables<"external_results">;
export type CarouselSlide = Tables<"carousel_slides">;
export type Event = Tables<"events">;
export type Introduction = Omit<Tables<"introduction">, "content"> & {
  content: Record<string, unknown>;
};
export type Announcement = Omit<Tables<"announcements">, "content"> & {
  content: Record<string, unknown>;
};
export type Profile = Pick<
  Tables<"profiles">,
  | "id"
  | "created_at"
  | "updated_at"
  | "display_name"
  | "avatar_url"
  | "role"
  | "phone"
  | "bio"
  | "linkedin"
  | "facebook"
  | "github"
  | "website"
  | "resume"
  | "social_links"
>;
export type PublicProfile = Tables<"public_profiles">;
export type Team = Omit<Tables<"teams">, never>;
export type Contact = Tables<"contacts">;
export type EventParticipant = Tables<"event_participants">;

export type OrganizationMemberCategory = "core" | "legal_entity" | "industry";
export type OrganizationMember = Tables<"organization_members">;

export type ResultType = "personal" | "team";
export type Result = Omit<Tables<"results">, "content" | "summary"> & {
  content: Record<string, unknown>;
  summary: string;
};

export type Tag = Tables<"tags">;
export type ResultTag = Tables<"result_tags">;
export type ResultCoauthor = Tables<"result_coauthors">;

// === Recruitment — structured view on top of competitions + private details ===

export type RecruitmentPositionType = "full_time" | "internship" | "part_time" | "remote";

export type RecruitmentPosition = {
  name: string;
  location: string | null;
  type: RecruitmentPositionType;
  count: number;
  salary: string | null;
  responsibilities: string | null;
  requirements: string | null;
  nice_to_have: string | null;
};

export type ApplicationMethodLink = { label: string; url: string };

export type ApplicationMethod = {
  email?: string;
  url?: string;
  links?: ApplicationMethodLink[];
  other?: string;
};

export type ContactInfo = {
  name?: string;
  email?: string;
  phone?: string;
};

type CompetitionsRow = Tables<"competitions">;

export type RecruitmentSummary = {
  id: string;
  created_at: string;
  updated_at: string;
  title: CompetitionsRow["title"];
  link: CompetitionsRow["link"];
  image: CompetitionsRow["image"];
  company_description: CompetitionsRow["company_description"];
  start_date: string;
  end_date: CompetitionsRow["end_date"];
  event_id: CompetitionsRow["event_id"];
  created_by: CompetitionsRow["created_by"];
  pinned: CompetitionsRow["pinned"];
};

export type Recruitment = RecruitmentSummary & {
  positions: RecruitmentPosition[] | null;
  application_method: ApplicationMethod | null;
  contact: ContactInfo | null;
  required_documents: string | null;
};

export type RecruitmentPrivateDetails = {
  competition_id: string;
  created_at: string;
  updated_at: string;
  positions: RecruitmentPosition[] | null;
  application_method: ApplicationMethod | null;
  contact: ContactInfo | null;
  required_documents: string | null;
};

export type RecruitmentInterest = Tables<"recruitment_interests">;

export type CompetitionOwner = Tables<"competition_owners">;
