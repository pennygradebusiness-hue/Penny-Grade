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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          duration_days: number
          id: string
          name: string
          price: number
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          name: string
          price: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          name?: string
          price?: number
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          expiry_date: string
          id: string
          membership_number: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["membership_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expiry_date: string
          id?: string
          membership_number?: string
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expiry_date?: string
          id?: string
          membership_number?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["membership_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      offers: {
        Row: {
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          max_discount: number | null
          minimum_bill: number
          partner_id: string
          status: Database["public"]["Enums"]["record_status"]
          terms_conditions: string | null
          title: string
          updated_at: string
          usage_limit_type: Database["public"]["Enums"]["usage_limit_type"]
          valid_days: number[]
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          max_discount?: number | null
          minimum_bill?: number
          partner_id: string
          status?: Database["public"]["Enums"]["record_status"]
          terms_conditions?: string | null
          title: string
          updated_at?: string
          usage_limit_type?: Database["public"]["Enums"]["usage_limit_type"]
          valid_days?: number[]
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          max_discount?: number | null
          minimum_bill?: number
          partner_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          terms_conditions?: string | null
          title?: string
          updated_at?: string
          usage_limit_type?: Database["public"]["Enums"]["usage_limit_type"]
          valid_days?: number[]
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string | null
          business_hours: string | null
          business_name: string
          category_id: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          featured: boolean
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          phone: string | null
          qr_created_at: string | null
          slug: string
          status: Database["public"]["Enums"]["partner_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          business_hours?: string | null
          business_name: string
          category_id?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          phone?: string | null
          qr_created_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          business_hours?: string | null
          business_name?: string
          category_id?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          featured?: boolean
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          phone?: string | null
          qr_created_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["partner_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_cards: {
        Row: {
          card_number: string
          created_at: string
          id: string
          issued_at: string | null
          membership_id: string | null
          status: Database["public"]["Enums"]["card_status"]
          updated_at: string
        }
        Insert: {
          card_number?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          membership_id?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
        }
        Update: {
          card_number?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          membership_id?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "physical_cards_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          mobile: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          mobile?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          mobile?: string | null
          updated_at?: string
          user_id?: string | null
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
      verification_logs: {
        Row: {
          bill_amount: number
          created_at: string
          discount_amount: number
          final_amount: number
          id: string
          membership_id: string | null
          offer_id: string | null
          partner_id: string | null
          status: string
          user_id: string | null
          verification_session_id: string | null
        }
        Insert: {
          bill_amount: number
          created_at?: string
          discount_amount: number
          final_amount: number
          id?: string
          membership_id?: string | null
          offer_id?: string | null
          partner_id?: string | null
          status?: string
          user_id?: string | null
          verification_session_id?: string | null
        }
        Update: {
          bill_amount?: number
          created_at?: string
          discount_amount?: number
          final_amount?: number
          id?: string
          membership_id?: string | null
          offer_id?: string | null
          partner_id?: string | null
          status?: string
          user_id?: string | null
          verification_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_logs_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_logs_verification_session_id_fkey"
            columns: ["verification_session_id"]
            isOneToOne: false
            referencedRelation: "verification_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_sessions: {
        Row: {
          bill_amount: number
          created_at: string
          discount_amount: number
          expires_at: string
          final_amount: number
          id: string
          membership_id: string
          offer_id: string
          partner_id: string
          status: Database["public"]["Enums"]["session_status"]
          user_id: string | null
        }
        Insert: {
          bill_amount: number
          created_at?: string
          discount_amount: number
          expires_at: string
          final_amount: number
          id?: string
          membership_id: string
          offer_id: string
          partner_id: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string | null
        }
        Update: {
          bill_amount?: number
          created_at?: string
          discount_amount?: number
          expires_at?: string
          final_amount?: number
          id?: string
          membership_id?: string
          offer_id?: string
          partner_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_sessions_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_sessions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_sessions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      create_verification: {
        Args:
          | { _bill: number; _partner_slug: string }
          | { _bill: number; _membership_number: string; _partner_slug: string }
        Returns: Json
      }
      admin_create_member: {
        Args: { p_card_id?: string | null; p_email: string | null; p_expiry_date: string; p_full_name: string; p_mobile: string; p_plan_id: string; p_start_date: string }
        Returns: Json
      }
      admin_assign_card: {
        Args: { p_member_id: string; p_card_id: string; p_old_card_status?: string }
        Returns: Json
      }
      admin_delete_member: { Args: { p_member_id: string }; Returns: Json }
      generate_physical_cards: { Args: { p_count: number }; Returns: Json }
      get_all_memberships: { Args: never; Returns: Json }
      get_all_physical_cards: { Args: never; Returns: Json }
      get_dashboard_stats: { Args: never; Returns: Json }
      gen_pen_code: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "membership_manager" | "support"
      card_status: "AVAILABLE" | "ACTIVE" | "LOST" | "CANCELLED"
      discount_type: "PERCENTAGE" | "FIXED"
      membership_status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED"
      partner_status: "ACTIVE" | "INACTIVE" | "SUSPENDED"
      record_status: "ACTIVE" | "INACTIVE"
      session_status: "ACTIVE" | "EXPIRED" | "CANCELLED"
      usage_limit_type: "UNLIMITED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "manager", "membership_manager", "support"],
      card_status: ["AVAILABLE", "ACTIVE", "LOST", "CANCELLED"],
      discount_type: ["PERCENTAGE", "FIXED"],
      membership_status: ["ACTIVE", "INACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"],
      partner_status: ["ACTIVE", "INACTIVE", "SUSPENDED"],
      record_status: ["ACTIVE", "INACTIVE"],
      session_status: ["ACTIVE", "EXPIRED", "CANCELLED"],
      usage_limit_type: ["UNLIMITED"],
    },
  },
} as const
