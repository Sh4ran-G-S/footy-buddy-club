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
      app_settings: {
        Row: {
          id: number
          updated_at: string
          upi_id: string | null
          upi_payee_name: string | null
        }
        Insert: {
          id?: number
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Update: {
          id?: number
          updated_at?: string
          upi_id?: string | null
          upi_payee_name?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          amount_due: number
          created_at: string
          id: string
          invited_by_user_id: string | null
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          session_id: string
          user_id: string
        }
        Insert: {
          amount_due?: number
          created_at?: string
          id?: string
          invited_by_user_id?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          session_id: string
          user_id: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          id?: string
          invited_by_user_id?: string | null
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          outstanding_balance: number
          phone: string | null
          reliability_score: number
          total_sessions: number
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          outstanding_balance?: number
          phone?: string | null
          reliability_score?: number
          total_sessions?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          outstanding_balance?: number
          phone?: string | null
          reliability_score?: number
          total_sessions?: number
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          expected_players: number
          ground_cost: number
          id: string
          results_set: boolean
          status: Database["public"]["Enums"]["session_status"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          expected_players?: number
          ground_cost?: number
          id?: string
          results_set?: boolean
          status?: Database["public"]["Enums"]["session_status"]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          expected_players?: number
          ground_cost?: number
          id?: string
          results_set?: boolean
          status?: Database["public"]["Enums"]["session_status"]
          title?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
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
        ]
      }
      teams: {
        Row: {
          captain_id: string | null
          created_at: string
          id: string
          placement: number | null
          session_id: string
          team_name: string
        }
        Insert: {
          captain_id?: string | null
          created_at?: string
          id?: string
          placement?: number | null
          session_id: string
          team_name: string
        }
        Update: {
          captain_id?: string | null
          created_at?: string
          id?: string
          placement?: number | null
          session_id?: string
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_organizer: { Args: { _user_id: string }; Returns: boolean }
      mark_session_overdue: {
        Args: { _session_id: string }
        Returns: undefined
      }
      recalc_session_dues: { Args: { _session_id: string }; Returns: undefined }
      recalc_user_stats: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "super_admin" | "organizer" | "player"
      payment_status: "pending" | "paid" | "overdue"
      session_status: "upcoming" | "active" | "completed"
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
      app_role: ["super_admin", "organizer", "player"],
      payment_status: ["pending", "paid", "overdue"],
      session_status: ["upcoming", "active", "completed"],
    },
  },
} as const
