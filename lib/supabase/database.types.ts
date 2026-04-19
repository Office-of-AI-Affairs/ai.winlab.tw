// Generated from the live public schema via MCP introspection
// (information_schema.columns + pg_constraint CHECK defs). Matches the shape
// that `supabase gen types typescript --project-id hwezfbhjcetpezfuvelf`
// would emit — re-run that command (needs SUPABASE_ACCESS_TOKEN) to
// regenerate, or update by hand when adding a new column / enum literal.
//
// DO NOT add domain types here. Put user-facing aliases in ./types.ts.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          date: string;
          category: string;
          title: string;
          content: Json;
          status: "draft" | "published";
          author_id: string | null;
          event_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          date?: string;
          category?: string;
          title?: string;
          content?: Json;
          status?: "draft" | "published";
          author_id?: string | null;
          event_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          date?: string;
          category?: string;
          title?: string;
          content?: Json;
          status?: "draft" | "published";
          author_id?: string | null;
          event_id?: string | null;
        };
        Relationships: [];
      };
      carousel_slides: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          description: string | null;
          link: string | null;
          image: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          description?: string | null;
          link?: string | null;
          image?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          description?: string | null;
          link?: string | null;
          image?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      competition_private_details: {
        Row: {
          competition_id: string;
          created_at: string;
          updated_at: string;
          positions: Json | null;
          application_method: Json | null;
          contact: Json | null;
          required_documents: string | null;
        };
        Insert: {
          competition_id: string;
          created_at?: string;
          updated_at?: string;
          positions?: Json | null;
          application_method?: Json | null;
          contact?: Json | null;
          required_documents?: string | null;
        };
        Update: {
          competition_id?: string;
          created_at?: string;
          updated_at?: string;
          positions?: Json | null;
          application_method?: Json | null;
          contact?: Json | null;
          required_documents?: string | null;
        };
        Relationships: [];
      };
      competitions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          link: string;
          image: string | null;
          start_date: string | null;
          company_description: string | null;
          event_id: string | null;
          end_date: string | null;
          created_by: string | null;
          pinned: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          link?: string;
          image?: string | null;
          start_date?: string | null;
          company_description?: string | null;
          event_id?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          pinned?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          link?: string;
          image?: string | null;
          start_date?: string | null;
          company_description?: string | null;
          event_id?: string | null;
          end_date?: string | null;
          created_by?: string | null;
          pinned?: boolean;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          position: string | null;
          phone: string | null;
          email: string | null;
          sort_order: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          position?: string | null;
          phone?: string | null;
          email?: string | null;
          sort_order?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          position?: string | null;
          phone?: string | null;
          email?: string | null;
          sort_order?: number;
        };
        Relationships: [];
      };
      event_participants: {
        Row: {
          event_id: string;
          user_id: string;
          created_at: string | null;
        };
        Insert: {
          event_id: string;
          user_id: string;
          created_at?: string | null;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      event_vendors: {
        Row: {
          event_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
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
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          slug: string;
          description?: string | null;
          cover_image?: string | null;
          pinned?: boolean;
          sort_order?: number;
          status?: "draft" | "published";
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          cover_image?: string | null;
          pinned?: boolean;
          sort_order?: number;
          status?: "draft" | "published";
        };
        Relationships: [];
      };
      external_results: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          user_id: string;
          title: string;
          description: string | null;
          link: string | null;
          image: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id: string;
          title: string;
          description?: string | null;
          link?: string | null;
          image?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          link?: string | null;
          image?: string | null;
        };
        Relationships: [];
      };
      introduction: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          content: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          content?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          content?: Json;
        };
        Relationships: [];
      };
      oauth_auth_codes: {
        Row: {
          code: string;
          data: Json;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          code: string;
          data: Json;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          code?: string;
          data?: Json;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      oauth_clients: {
        Row: {
          client_id: string;
          client_name: string;
          redirect_uris: Json;
          grant_types: Json;
          response_types: Json;
          created_at: string;
        };
        Insert: {
          client_id: string;
          client_name: string;
          redirect_uris: Json;
          grant_types: Json;
          response_types: Json;
          created_at?: string;
        };
        Update: {
          client_id?: string;
          client_name?: string;
          redirect_uris?: Json;
          grant_types?: Json;
          response_types?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          category: "core" | "legal_entity" | "industry";
          name: string;
          summary: string | null;
          image: string | null;
          link: string | null;
          sort_order: number;
          school: string | null;
          research_areas: string | null;
          email: string | null;
          website: string | null;
          member_role: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          category: "core" | "legal_entity" | "industry";
          name: string;
          summary?: string | null;
          image?: string | null;
          link?: string | null;
          sort_order?: number;
          school?: string | null;
          research_areas?: string | null;
          email?: string | null;
          website?: string | null;
          member_role?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          category?: "core" | "legal_entity" | "industry";
          name?: string;
          summary?: string | null;
          image?: string | null;
          link?: string | null;
          sort_order?: number;
          school?: string | null;
          research_areas?: string | null;
          email?: string | null;
          website?: string | null;
          member_role?: string | null;
        };
        Relationships: [];
      };
      privacy_policy: {
        Row: {
          id: string;
          content: Json;
          version: number;
          note: string | null;
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          content: Json;
          version: number;
          note?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          content?: Json;
          version?: number;
          note?: string | null;
          created_at?: string;
          created_by?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          role: "admin" | "user" | "vendor";
          created_at: string;
          updated_at: string;
          phone: string | null;
          social_links: string[] | null;
          bio: string | null;
          linkedin: string | null;
          facebook: string | null;
          github: string | null;
          website: string | null;
          resume: string | null;
          tags: string[];
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "user" | "vendor";
          created_at?: string;
          updated_at?: string;
          phone?: string | null;
          social_links?: string[] | null;
          bio?: string | null;
          linkedin?: string | null;
          facebook?: string | null;
          github?: string | null;
          website?: string | null;
          resume?: string | null;
          tags?: string[];
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "user" | "vendor";
          created_at?: string;
          updated_at?: string;
          phone?: string | null;
          social_links?: string[] | null;
          bio?: string | null;
          linkedin?: string | null;
          facebook?: string | null;
          github?: string | null;
          website?: string | null;
          resume?: string | null;
          tags?: string[];
        };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          display_name: string | null;
          avatar_url: string | null;
          has_profile_data: boolean;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          has_profile_data?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          has_profile_data?: boolean;
        };
        Relationships: [];
      };
      public_teams: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          name: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
        };
        Relationships: [];
      };
      recruitment_interests: {
        Row: {
          id: string;
          competition_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      result_coauthors: {
        Row: {
          result_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          result_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          result_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      result_tags: {
        Row: {
          result_id: string;
          tag_id: string;
        };
        Insert: {
          result_id: string;
          tag_id: string;
        };
        Update: {
          result_id?: string;
          tag_id?: string;
        };
        Relationships: [];
      };
      results: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          title: string;
          date: string;
          header_image: string | null;
          summary: string | null;
          content: Json | null;
          status: "draft" | "published";
          author_id: string | null;
          type: "personal" | "team";
          team_id: string | null;
          pinned: boolean;
          event_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          date?: string;
          header_image?: string | null;
          summary?: string | null;
          content?: Json | null;
          status?: "draft" | "published";
          author_id?: string | null;
          type?: "personal" | "team";
          team_id?: string | null;
          pinned?: boolean;
          event_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          title?: string;
          date?: string;
          header_image?: string | null;
          summary?: string | null;
          content?: Json | null;
          status?: "draft" | "published";
          author_id?: string | null;
          type?: "personal" | "team";
          team_id?: string | null;
          pinned?: boolean;
          event_id?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          parent_id?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          parent_id?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      team_invitations: {
        Row: {
          id: string;
          team_id: string;
          email: string;
          invited_by: string;
          status: "pending" | "accepted" | "rejected";
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          email: string;
          invited_by: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          email?: string;
          invited_by?: string;
          status?: "pending" | "accepted" | "rejected";
          created_at?: string;
        };
        Relationships: [];
      };
      team_members: {
        Row: {
          team_id: string;
          user_id: string;
          role: "leader" | "member";
          joined_at: string;
        };
        Insert: {
          team_id: string;
          user_id: string;
          role: "leader" | "member";
          joined_at?: string;
        };
        Update: {
          team_id?: string;
          user_id?: string;
          role?: "leader" | "member";
          joined_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          leader_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          leader_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          leader_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      upload_tokens: {
        Row: {
          token: string;
          user_id: string;
          category: string;
          expires_at: string;
          used: boolean;
          access_token: string | null;
        };
        Insert: {
          token: string;
          user_id: string;
          category?: string;
          expires_at?: string;
          used?: boolean;
          access_token?: string | null;
        };
        Update: {
          token?: string;
          user_id?: string;
          category?: string;
          expires_at?: string;
          used?: boolean;
          access_token?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      admin_create_user: {
        Args: { p_email: string; p_name?: string | null; p_role?: string };
        Returns: string;
      };
      admin_delete_user: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      consume_upload_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      get_all_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          display_name: string | null;
          role: string;
          created_at: string;
          tags: string[];
        }[];
      };
      get_interest_count: {
        Args: { p_competition_id: string };
        Returns: number;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience helpers matching Supabase's official output.
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
