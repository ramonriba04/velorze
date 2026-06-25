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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      company_profiles: {
        Row: {
          contact_email: string | null
          country: string | null
          created_at: string
          description: string | null
          legal_name: string
          logo_url: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          contact_email?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          legal_name: string
          logo_url?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          contact_email?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          legal_name?: string
          logo_url?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          investor_id: string
          message: string | null
          project_id: string
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          investor_id: string
          message?: string | null
          project_id: string
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          investor_id?: string
          message?: string | null
          project_id?: string
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          company_id: string
          contact_request_id: string
          created_at: string
          id: string
          investor_id: string
          project_id: string
        }
        Insert: {
          company_id: string
          contact_request_id: string
          created_at?: string
          id?: string
          investor_id: string
          project_id: string
        }
        Update: {
          company_id?: string
          contact_request_id?: string
          created_at?: string
          id?: string
          investor_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_contact_request_id_fkey"
            columns: ["contact_request_id"]
            isOneToOne: true
            referencedRelation: "contact_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          investor_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          investor_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          investor_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_profiles: {
        Row: {
          avatar_url: string | null
          countries: string[]
          created_at: string
          description: string | null
          display_name: string | null
          investment_types: Database["public"]["Enums"]["investment_type"][]
          kind: Database["public"]["Enums"]["investor_kind"]
          risk_level: Database["public"]["Enums"]["risk_level"]
          sectors: string[]
          ticket_max: number | null
          ticket_min: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          countries?: string[]
          created_at?: string
          description?: string | null
          display_name?: string | null
          investment_types?: Database["public"]["Enums"]["investment_type"][]
          kind?: Database["public"]["Enums"]["investor_kind"]
          risk_level?: Database["public"]["Enums"]["risk_level"]
          sectors?: string[]
          ticket_max?: number | null
          ticket_min?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          countries?: string[]
          created_at?: string
          description?: string | null
          display_name?: string | null
          investment_types?: Database["public"]["Enums"]["investment_type"][]
          kind?: Database["public"]["Enums"]["investor_kind"]
          risk_level?: Database["public"]["Enums"]["risk_level"]
          sectors?: string[]
          ticket_max?: number | null
          ticket_min?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      match_scores: {
        Row: {
          computed_at: string
          investor_id: string
          project_id: string
          reasons: Json
          score: number
        }
        Insert: {
          computed_at?: string
          investor_id: string
          project_id: string
          reasons?: Json
          score: number
        }
        Update: {
          computed_at?: string
          investor_id?: string
          project_id?: string
          reasons?: Json
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read_at: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read_at?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          locale: string
          onboarding_completed_at: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          locale?: string
          onboarding_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          locale?: string
          onboarding_completed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_images: {
        Row: {
          created_at: string
          id: string
          project_id: string
          sort_order: number
          storage_path: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          sort_order?: number
          storage_path?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          capital_required: number
          company_id: string
          country: string
          cover_url: string | null
          created_at: string
          description: string
          id: string
          investment_type: Database["public"]["Enums"]["investment_type"]
          sector: string
          stage: Database["public"]["Enums"]["business_stage"]
          status: Database["public"]["Enums"]["project_status"]
          ticket_max: number | null
          ticket_min: number | null
          title: string
          updated_at: string
        }
        Insert: {
          capital_required: number
          company_id: string
          country: string
          cover_url?: string | null
          created_at?: string
          description: string
          id?: string
          investment_type: Database["public"]["Enums"]["investment_type"]
          sector: string
          stage: Database["public"]["Enums"]["business_stage"]
          status?: Database["public"]["Enums"]["project_status"]
          ticket_max?: number | null
          ticket_min?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          capital_required?: number
          company_id?: string
          country?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          investment_type?: Database["public"]["Enums"]["investment_type"]
          sector?: string
          stage?: Database["public"]["Enums"]["business_stage"]
          status?: Database["public"]["Enums"]["project_status"]
          ticket_max?: number | null
          ticket_min?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_my_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: undefined
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "empresa" | "inversor" | "admin"
      business_stage: "idea" | "crecimiento" | "expansion"
      contact_status: "pending" | "accepted" | "rejected"
      investment_type:
        | "equity"
        | "prestamo"
        | "joint_venture"
        | "convertible"
        | "otro"
      investor_kind: "personal" | "corporativo"
      project_status: "draft" | "published" | "closed"
      risk_level: "bajo" | "medio" | "alto"
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
    Enums: {
      app_role: ["empresa", "inversor", "admin"],
      business_stage: ["idea", "crecimiento", "expansion"],
      contact_status: ["pending", "accepted", "rejected"],
      investment_type: [
        "equity",
        "prestamo",
        "joint_venture",
        "convertible",
        "otro",
      ],
      investor_kind: ["personal", "corporativo"],
      project_status: ["draft", "published", "closed"],
      risk_level: ["bajo", "medio", "alto"],
    },
  },
} as const
