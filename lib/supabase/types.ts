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
  role: "admin" | "user";
  phone: string | null;
  social_links: string[] | null;
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
  | "ai_newcomer"
  | "industry_academy"
  | "alumni";

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

export type RecruitmentPosition = {
  name: string;
  count: number;
  location: string | null;
};

export type Recruitment = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  link: string;
  image: string | null;
  date: string;
  description: string | null;
  location: string | null;
  positions: RecruitmentPosition[] | null;
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
};
