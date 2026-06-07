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
      folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_link_tags: {
        Row: {
          qr_id: string
          tag_id: string
        }
        Insert: {
          qr_id: string
          tag_id: string
        }
        Update: {
          qr_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_link_tags_qr_id_fkey"
            columns: ["qr_id"]
            isOneToOne: false
            referencedRelation: "qr_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_link_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_links: {
        Row: {
          active: boolean
          add_utm: boolean
          bg_color: string
          clicks: number
          color: string
          created_at: string
          destination_url: string
          folder_id: string | null
          frame_style: string
          frame_text: string | null
          ga4_id: string | null
          gtm_id: string | null
          id: string
          linkedin_partner_id: string | null
          logo_url: string | null
          meta_pixel_id: string | null
          pinterest_tag_id: string | null
          short_id: string
          style: Json
          tiktok_pixel_id: string | null
          title: string
          twitter_pixel_id: string | null
          type: string
          user_id: string
          vcard_data: Json | null
        }
        Insert: {
          active?: boolean
          add_utm?: boolean
          bg_color?: string
          clicks?: number
          color?: string
          created_at?: string
          destination_url: string
          folder_id?: string | null
          frame_style?: string
          frame_text?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          id?: string
          linkedin_partner_id?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          pinterest_tag_id?: string | null
          short_id: string
          style?: Json
          tiktok_pixel_id?: string | null
          title: string
          twitter_pixel_id?: string | null
          type: string
          user_id: string
          vcard_data?: Json | null
        }
        Update: {
          active?: boolean
          add_utm?: boolean
          bg_color?: string
          clicks?: number
          color?: string
          created_at?: string
          destination_url?: string
          folder_id?: string | null
          frame_style?: string
          frame_text?: string | null
          ga4_id?: string | null
          gtm_id?: string | null
          id?: string
          linkedin_partner_id?: string | null
          logo_url?: string | null
          meta_pixel_id?: string | null
          pinterest_tag_id?: string | null
          short_id?: string
          style?: Json
          tiktok_pixel_id?: string | null
          title?: string
          twitter_pixel_id?: string | null
          type?: string
          user_id?: string
          vcard_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_links_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          device: string | null
          id: string
          os: string | null
          qr_id: string
          referrer: string | null
          scanned_at: string
          visitor_hash: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          id?: string
          os?: string | null
          qr_id: string
          referrer?: string | null
          scanned_at?: string
          visitor_hash?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          device?: string | null
          id?: string
          os?: string | null
          qr_id?: string
          referrer?: string | null
          scanned_at?: string
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_id_fkey"
            columns: ["qr_id"]
            isOneToOne: false
            referencedRelation: "qr_links"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      qr_unique_visitors: {
        Args: { p_days: number }
        Returns: {
          qr_id: string
          uniques: number
        }[]
      }
      resolve_qr: {
        Args: { p_short_id: string }
        Returns: {
          active: boolean
          add_utm: boolean
          destination_url: string
          ga4_id: string
          gtm_id: string
          id: string
          linkedin_partner_id: string
          meta_pixel_id: string
          pinterest_tag_id: string
          tiktok_pixel_id: string
          title: string
          twitter_pixel_id: string
          type: string
          vcard_data: Json
        }[]
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
