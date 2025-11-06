export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      kiosk_stations: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          owner_id: string | null
          primary_color: string | null
          slug: string
          sms_template_1d: string | null
          sms_template_3d: string | null
          sms_template_5d: string | null
          station_address: string | null
          station_phone: string | null
          total_reminders: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          primary_color?: string | null
          slug: string
          sms_template_1d?: string | null
          sms_template_3d?: string | null
          sms_template_5d?: string | null
          station_address?: string | null
          station_phone?: string | null
          total_reminders?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          primary_color?: string | null
          slug?: string
          sms_template_1d?: string | null
          sms_template_3d?: string | null
          sms_template_5d?: string | null
          station_address?: string | null
          station_phone?: string | null
          total_reminders?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          channel: string
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          estimated_cost: number | null
          id: string
          message_body: string
          provider: string | null
          provider_message_id: string | null
          recipient: string
          reminder_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          channel: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          message_body: string
          provider?: string | null
          provider_message_id?: string | null
          recipient: string
          reminder_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          id?: string
          message_body?: string
          provider?: string | null
          provider_message_id?: string | null
          recipient?: string
          reminder_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: unknown
          phone_number: string
          source: string | null
          station_id: string | null
          user_agent: string | null
          verification_code: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          phone_number: string
          source?: string | null
          station_id?: string | null
          user_agent?: string | null
          verification_code: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          phone_number?: string
          source?: string | null
          station_id?: string | null
          user_agent?: string | null
          verification_code?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verifications_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kiosk_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          consent_given: boolean | null
          consent_ip: unknown
          consent_timestamp: string | null
          created_at: string | null
          deleted_at: string | null
          expiry_date: string
          guest_name: string | null
          guest_phone: string | null
          id: string
          last_notification_sent_at: string | null
          next_notification_date: string | null
          notification_channels: Json | null
          notification_intervals: Json | null
          opt_out: boolean | null
          opt_out_timestamp: string | null
          phone_verified: boolean | null
          plate_number: string
          reminder_type: string | null
          source: string | null
          station_id: string | null
          updated_at: string | null
          user_id: string | null
          verification_id: string | null
        }
        Insert: {
          consent_given?: boolean | null
          consent_ip?: unknown
          consent_timestamp?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expiry_date: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_notification_sent_at?: string | null
          next_notification_date?: string | null
          notification_channels?: Json | null
          notification_intervals?: Json | null
          opt_out?: boolean | null
          opt_out_timestamp?: string | null
          phone_verified?: boolean | null
          plate_number: string
          reminder_type?: string | null
          source?: string | null
          station_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_id?: string | null
        }
        Update: {
          consent_given?: boolean | null
          consent_ip?: unknown
          consent_timestamp?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expiry_date?: string
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_notification_sent_at?: string | null
          next_notification_date?: string | null
          notification_channels?: Json | null
          notification_intervals?: Json | null
          opt_out?: boolean | null
          opt_out_timestamp?: string | null
          phone_verified?: boolean | null
          plate_number?: string
          reminder_type?: string | null
          source?: string | null
          station_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reminders_station"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kiosk_stations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "phone_verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          full_name: string | null
          id: string
          latitude: number | null
          longitude: number | null
          phone: string | null
          postal_code: string | null
          prefers_sms: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          station_id: string | null
          subdivision: string | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          prefers_sms?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          station_id?: string | null
          subdivision?: string | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          postal_code?: string | null
          prefers_sms?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          station_id?: string | null
          subdivision?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_profiles_station"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kiosk_stations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      current_user_is_admin: {
        Row: {
          is_admin: boolean | null
          user_id: string | null
        }
        Relationships: []
      }
      current_user_role: {
        Row: {
          role: Database["public"]["Enums"]["user_role"] | null
          user_id: string | null
        }
        Relationships: []
      }
      verification_analytics: {
        Row: {
          avg_verification_time_minutes: number | null
          blocked_attempts: number | null
          date: string | null
          expired_codes: number | null
          source: string | null
          success_rate_percent: number | null
          successful_verifications: number | null
          total_requests: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_active_verification: {
        Args: { p_phone: string }
        Returns: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          phone_number: string
          verification_code: string
        }[]
      }
      get_reminders_for_notification: {
        Args: never
        Returns: {
          days_until_expiry: number
          expiry_date: string
          plate_number: string
          preferred_channel: string
          recipient_email: string
          recipient_phone: string
          reminder_id: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_vehicles_expiring_in_days: {
        Args: { days_count: number }
        Returns: {
          days_until_expiry: number
          itp_expiry_date: string
          notification_phone: string
          plate_number: string
          user_email: string
          user_name: string
          vehicle_id: string
        }[]
      }
      increment_verification_attempts: {
        Args: { p_verification_id: string }
        Returns: boolean
      }
      is_phone_rate_limited: {
        Args: { p_max_attempts?: number; p_phone: string }
        Returns: boolean
      }
      mark_vehicle_notified: { Args: { vehicle_id: string }; Returns: boolean }
      mark_verification_complete: {
        Args: { p_verification_id: string }
        Returns: boolean
      }
      normalize_phone_for_notification: {
        Args: { phone: string }
        Returns: string
      }
    }
    Enums: {
      user_role: "user" | "station_manager" | "admin"
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
      user_role: ["user", "station_manager", "admin"],
    },
  },
} as const

// Helper type exports for easier usage
export type UserRole = Database["public"]["Enums"]["user_role"];
export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
