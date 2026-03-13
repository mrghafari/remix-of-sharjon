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
      building_members: {
        Row: {
          building_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_members_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_members_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          total_units: number | null
          updated_at: string
          vacant_charge_discount_percent: number
          vacant_extra_charge_discount_percent: number
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          total_units?: number | null
          updated_at?: string
          vacant_charge_discount_percent?: number
          vacant_extra_charge_discount_percent?: number
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          total_units?: number | null
          updated_at?: string
          vacant_charge_discount_percent?: number
          vacant_extra_charge_discount_percent?: number
        }
        Relationships: []
      }
      category_allocation_settings: {
        Row: {
          allowed_allocation_types: Database["public"]["Enums"]["allocation_type"][]
          building_id: string
          category: Database["public"]["Enums"]["expense_category"] | null
          category_id: string | null
          created_at: string
          default_allocation_type: Database["public"]["Enums"]["allocation_type"]
          id: string
          updated_at: string
        }
        Insert: {
          allowed_allocation_types?: Database["public"]["Enums"]["allocation_type"][]
          building_id: string
          category?: Database["public"]["Enums"]["expense_category"] | null
          category_id?: string | null
          created_at?: string
          default_allocation_type?: Database["public"]["Enums"]["allocation_type"]
          id?: string
          updated_at?: string
        }
        Update: {
          allowed_allocation_types?: Database["public"]["Enums"]["allocation_type"][]
          building_id?: string
          category?: Database["public"]["Enums"]["expense_category"] | null
          category_id?: string | null
          created_at?: string
          default_allocation_type?: Database["public"]["Enums"]["allocation_type"]
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_allocation_settings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_allocation_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          building_id: string
          created_at: string
          icon: string
          id: string
          is_system: boolean
          label: string
          name: string
        }
        Insert: {
          building_id: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          label: string
          name: string
        }
        Update: {
          building_id?: string
          created_at?: string
          icon?: string
          id?: string
          is_system?: boolean
          label?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          allocation_type: Database["public"]["Enums"]["allocation_type"]
          amount: number
          area_ratio: number | null
          building_id: string
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          description: string | null
          expense_date: string
          fund_type: Database["public"]["Enums"]["fund_type"]
          id: string
          is_paid: boolean | null
          project_id: string | null
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          allocation_type?: Database["public"]["Enums"]["allocation_type"]
          amount: number
          area_ratio?: number | null
          building_id: string
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          expense_date?: string
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          is_paid?: boolean | null
          project_id?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          allocation_type?: Database["public"]["Enums"]["allocation_type"]
          amount?: number
          area_ratio?: number | null
          building_id?: string
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          description?: string | null
          expense_date?: string
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          is_paid?: boolean | null
          project_id?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      managers: {
        Row: {
          building_id: string
          charge_discount_percent: number
          created_at: string
          email: string | null
          end_date: string | null
          external_name: string | null
          extra_charge_discount_percent: number
          id: string
          is_active: boolean
          mobile: string | null
          role_type: string
          start_date: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          building_id: string
          charge_discount_percent?: number
          created_at?: string
          email?: string | null
          end_date?: string | null
          external_name?: string | null
          extra_charge_discount_percent?: number
          id?: string
          is_active?: boolean
          mobile?: string | null
          role_type: string
          start_date?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          building_id?: string
          charge_discount_percent?: number
          created_at?: string
          email?: string | null
          end_date?: string | null
          external_name?: string | null
          extra_charge_discount_percent?: number
          id?: string
          is_active?: boolean
          mobile?: string | null
          role_type?: string
          start_date?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "managers_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "managers_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          building_id: string
          created_at: string
          description: string | null
          fund_type: Database["public"]["Enums"]["fund_type"]
          id: string
          month: number
          payment_date: string
          unit_id: string
          year: number
        }
        Insert: {
          amount: number
          building_id: string
          created_at?: string
          description?: string | null
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          month: number
          payment_date?: string
          unit_id: string
          year: number
        }
        Update: {
          amount?: number
          building_id?: string
          created_at?: string
          description?: string | null
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          month?: number
          payment_date?: string
          unit_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_blocked: boolean
          max_buildings: number
          max_units_per_building: number
          phone: string | null
          subscription_plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          max_buildings?: number
          max_units_per_building?: number
          phone?: string | null
          subscription_plan?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          max_buildings?: number
          max_units_per_building?: number
          phone?: string | null
          subscription_plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          apply_manager_discount: boolean
          budget: number | null
          building_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean
          manager_charge_discount_percent: number
          manager_extra_charge_discount_percent: number
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          apply_manager_discount?: boolean
          budget?: number | null
          building_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          manager_charge_discount_percent?: number
          manager_extra_charge_discount_percent?: number
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          apply_manager_discount?: boolean
          budget?: number | null
          building_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          manager_charge_discount_percent?: number
          manager_extra_charge_discount_percent?: number
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          area: number | null
          building_id: string
          created_at: string
          floor: number | null
          id: string
          is_occupied: boolean | null
          landline_phone: string | null
          owner_name: string
          phone: string | null
          resident_count: number | null
          resident_name: string | null
          resident_phone: string | null
          unit_number: string
          updated_at: string
        }
        Insert: {
          area?: number | null
          building_id: string
          created_at?: string
          floor?: number | null
          id?: string
          is_occupied?: boolean | null
          landline_phone?: string | null
          owner_name: string
          phone?: string | null
          resident_count?: number | null
          resident_name?: string | null
          resident_phone?: string | null
          unit_number: string
          updated_at?: string
        }
        Update: {
          area?: number | null
          building_id?: string
          created_at?: string
          floor?: number | null
          id?: string
          is_occupied?: boolean | null
          landline_phone?: string | null
          owner_name?: string
          phone?: string | null
          resident_count?: number | null
          resident_name?: string | null
          resident_phone?: string | null
          unit_number?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
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
      admin_create_building_for_user: {
        Args: {
          _address?: string
          _name: string
          _total_units?: number
          _user_id: string
        }
        Returns: string
      }
      admin_reassign_building: {
        Args: { _building_id: string; _new_user_id: string }
        Returns: undefined
      }
      get_admin_buildings: {
        Args: never
        Returns: {
          address: string
          created_at: string
          id: string
          manager_email: string
          manager_name: string
          name: string
          total_units: number
        }[]
      }
      get_admin_customers: {
        Args: never
        Returns: {
          buildings_count: number
          created_at: string
          email: string
          full_name: string
          is_blocked: boolean
          max_buildings: number
          max_units_per_building: number
          phone: string
          subscription_plan: string
          total_units: number
          user_id: string
        }[]
      }
      get_admin_stats: {
        Args: never
        Returns: {
          blocked_users: number
          enterprise_users: number
          free_users: number
          pro_users: number
          total_buildings: number
          total_units: number
          total_users: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_building_manager: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
      is_building_member: {
        Args: { _building_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      allocation_type:
        | "single_unit"
        | "by_area"
        | "by_residents"
        | "by_area_residents"
        | "equal"
      app_role: "super_admin" | "manager" | "resident"
      expense_category:
        | "charge"
        | "repair"
        | "cleaning"
        | "water"
        | "electricity"
        | "gas"
        | "elevator"
        | "parking"
        | "security"
        | "other"
      fund_type: "charge" | "extra_charge"
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
      allocation_type: [
        "single_unit",
        "by_area",
        "by_residents",
        "by_area_residents",
        "equal",
      ],
      app_role: ["super_admin", "manager", "resident"],
      expense_category: [
        "charge",
        "repair",
        "cleaning",
        "water",
        "electricity",
        "gas",
        "elevator",
        "parking",
        "security",
        "other",
      ],
      fund_type: ["charge", "extra_charge"],
    },
  },
} as const
