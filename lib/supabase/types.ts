export type ExternalResult = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  title: string;
  description: string | null;
  link: string | null;
  image: string | null;
};

export type CarouselSlide = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  description: string | null;
  link: string | null;
  image: string | null;
  sort_order: number;
};

export type Event = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  pinned: boolean;
  sort_order: number;
  status: "draft" | "published";
};

export type Announcement = {
  id: string;
  created_at: string;
  updated_at: string;
  date: string;
  category: string;
  title: string;
  content: Record<string, unknown>;
  status: "draft" | "published";
  author_id: string | null;
  event_id: string | null;
};

export type Introduction = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  content: Record<string, unknown>;
};

export type Profile = {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user" | "vendor";
  phone: string | null;
  bio: string | null;
  linkedin: string | null;
  facebook: string | null;
  github: string | null;
  website: string | null;
  resume: string | null;
  social_links: string[] | null;
};

export type PublicProfile = {
  id: string;
  created_at: string;
  updated_at: string;
  display_name: string | null;
};

export type Team = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  description: string | null;
  leader_id: string;
};

export type TeamMember = {
  team_id: string;
  user_id: string;
  role: "leader" | "member";
  joined_at: string;
};

export type TeamInvitation = {
  id: string;
  team_id: string;
  email: string;
  invited_by: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
};

export type OrganizationMemberCategory =
  | "core"
  | "legal_entity"
  | "industry";

export type OrganizationMember = {
  id: string;
  created_at: string;
  updated_at: string;
  category: OrganizationMemberCategory;
  name: string;
  summary: string | null;
  image: string | null;
  link: string | null;
  sort_order: number;
  // New fields
  school: string | null;
  research_areas: string | null;
  email: string | null;
  website: string | null;
  member_role: string | null;
};

export type Contact = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
};

export type RecruitmentPositionType =
  | "full_time"
  | "internship"
  | "part_time"
  | "remote";

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

export type ApplicationMethod = {
  email?: string;
  url?: string;
  links?: ApplicationMethodLink[];
  other?: string;
};

export type ApplicationMethodLink = {
  label: string;
  url: string;
};

export type ContactInfo = {
  name?: string;
  email?: string;
  phone?: string;
};

export type Recruitment = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  link: string;
  image: string | null;
  company_description: string | null;
  start_date: string;
  end_date: string | null;
  positions: RecruitmentPosition[] | null;
  application_method: ApplicationMethod | null;
  contact: ContactInfo | null;
  required_documents: string | null;
  event_id: string | null;
  created_by: string | null;
};

export type RecruitmentSummary = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  link: string;
  image: string | null;
  company_description: string | null;
  start_date: string;
  end_date: string | null;
  event_id: string | null;
  created_by: string | null;
};

export type RecruitmentInterest = {
  id: string;
  competition_id: string;
  user_id: string;
  created_at: string;
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

export type Tag = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
};

export type ResultTag = {
  result_id: string;
  tag_id: string;
};

export type ResultType = "personal" | "team";

export type Result = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  date: string;
  header_image: string | null;
  summary: string;
  content: Record<string, unknown>;
  status: "draft" | "published";
  author_id: string | null;
  type: ResultType;
  team_id: string | null;
  pinned: boolean;
  event_id: string | null;
};
