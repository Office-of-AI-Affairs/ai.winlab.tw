export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author_id: string | null
          category: string
          content: Json
          created_at: string
          date: string
          event_id: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string
          content?: Json
          created_at?: string
          date?: string
          event_id?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: Json
          created_at?: string
          date?: string
          event_id?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      carousel_slides: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          link: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          link?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          link?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      competition_owners: {
        Row: {
          added_by: string | null
          competition_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          competition_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          competition_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_owners_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competition_private_details: {
        Row: {
          application_method: Json | null
          competition_id: string
          contact: Json | null
          created_at: string
          positions: Json | null
          required_documents: string | null
          updated_at: string
        }
        Insert: {
          application_method?: Json | null
          competition_id: string
          contact?: Json | null
          created_at?: string
          positions?: Json | null
          required_documents?: string | null
          updated_at?: string
        }
        Update: {
          application_method?: Json | null
          competition_id?: string
          contact?: Json | null
          created_at?: string
          positions?: Json | null
          required_documents?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competition_private_details_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: true
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          company_description: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          event_id: string | null
          id: string
          image: string | null
          link: string
          pinned: boolean
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_description?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          image?: string | null
          link?: string
          pinned?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          company_description?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          event_id?: string | null
          id?: string
          image?: string | null
          link?: string
          pinned?: boolean
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          position: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          position?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      event_participants: {
        Row: {
          created_at: string | null
          event_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          cover_image: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          pinned: boolean
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          pinned?: boolean
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          pinned?: boolean
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      external_results: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          link: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          link?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          link?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      introduction: {
        Row: {
          content: Json
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      oauth_auth_codes: {
        Row: {
          code: string
          created_at: string
          data: Json
          expires_at: string
        }
        Insert: {
          code: string
          created_at?: string
          data: Json
          expires_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          data?: Json
          expires_at?: string
        }
        Relationships: []
      }
      oauth_clients: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          grant_types: Json
          redirect_uris: Json
          response_types: Json
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string
          grant_types: Json
          redirect_uris: Json
          response_types: Json
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          grant_types?: Json
          redirect_uris?: Json
          response_types?: Json
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          category: string
          created_at: string
          email: string | null
          id: string
          image: string | null
          link: string | null
          member_role: string | null
          name: string
          research_areas: string | null
          school: string | null
          sort_order: number
          summary: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          category: string
          created_at?: string
          email?: string | null
          id?: string
          image?: string | null
          link?: string | null
          member_role?: string | null
          name: string
          research_areas?: string | null
          school?: string | null
          sort_order?: number
          summary?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          image?: string | null
          link?: string | null
          member_role?: string | null
          name?: string
          research_areas?: string | null
          school?: string | null
          sort_order?: number
          summary?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      privacy_policy: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "privacy_policy_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          facebook: string | null
          github: string | null
          id: string
          linkedin: string | null
          phone: string | null
          resume: string | null
          role: string
          social_links: string[] | null
          tags: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          facebook?: string | null
          github?: string | null
          id: string
          linkedin?: string | null
          phone?: string | null
          resume?: string | null
          role?: string
          social_links?: string[] | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          facebook?: string | null
          github?: string | null
          id?: string
          linkedin?: string | null
          phone?: string | null
          resume?: string | null
          role?: string
          social_links?: string[] | null
          tags?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          has_profile_data: boolean
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          has_profile_data?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          has_profile_data?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_teams: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_teams_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      recruitment_interests: {
        Row: {
          competition_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          competition_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recruitment_interests_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
        ]
      }
      result_coauthors: {
        Row: {
          created_at: string
          result_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          result_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          result_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_coauthors_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_coauthors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      result_tags: {
        Row: {
          result_id: string
          tag_id: string
        }
        Insert: {
          result_id: string
          tag_id: string
        }
        Update: {
          result_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "result_tags_result_id_fkey"
            columns: ["result_id"]
            isOneToOne: false
            referencedRelation: "results"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "result_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      results: {
        Row: {
          author_id: string | null
          content: Json | null
          created_at: string
          date: string
          event_id: string | null
          header_image: string | null
          id: string
          pinned: boolean
          status: string
          summary: string | null
          team_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: Json | null
          created_at?: string
          date?: string
          event_id?: string | null
          header_image?: string | null
          id?: string
          pinned?: boolean
          status?: string
          summary?: string | null
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: Json | null
          created_at?: string
          date?: string
          event_id?: string | null
          header_image?: string | null
          id?: string
          pinned?: boolean
          status?: string
          summary?: string | null
          team_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tags_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          id: string
          invited_by: string
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invited_by: string
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role: string
          team_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_tokens: {
        Row: {
          access_token: string | null
          category: string
          expires_at: string
          token: string
          used: boolean
          user_id: string
        }
        Insert: {
          access_token?: string | null
          category: string
          expires_at?: string
          token: string
          used?: boolean
          user_id: string
        }
        Update: {
          access_token?: string | null
          category?: string
          expires_at?: string
          token?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: { p_email: string; p_name?: string; p_role?: string }
        Returns: string
      }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      compute_has_profile_data: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: boolean
      }
      consume_upload_token: { Args: { p_token: string }; Returns: Json }
      create_oauth_auth_code: {
        Args: { p_code: string; p_data: Json }
        Returns: undefined
      }
      exchange_oauth_auth_code: { Args: { p_code: string }; Returns: Json }
      get_all_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          role: string
          tags: string[]
        }[]
      }
      get_interest_count: {
        Args: { p_competition_id: string }
        Returns: number
      }
      get_public_recruitment_positions: {
        Args: { p_competition_id: string }
        Returns: Json
      }
      get_user_team_ids: { Args: { p_user_id: string }; Returns: string[] }
      gravatar_url: { Args: { email: string }; Returns: string }
      is_team_leader: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
