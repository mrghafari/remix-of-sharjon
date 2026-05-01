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
      building_announcements: {
        Row: {
          building_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          is_pinned: boolean
          title: string
          updated_at: string
        }
        Insert: {
          building_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_pinned?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_pinned?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_announcements_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_bank_accounts: {
        Row: {
          account_holder: string
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          bank_name: string | null
          building_id: string
          created_at: string
          created_by: string
          iban: string
          id: string
          is_active: boolean
          is_approved: boolean
          is_rejected: boolean
          updated_at: string
        }
        Insert: {
          account_holder: string
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_name?: string | null
          building_id: string
          created_at?: string
          created_by: string
          iban: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_rejected?: boolean
          updated_at?: string
        }
        Update: {
          account_holder?: string
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          bank_name?: string | null
          building_id?: string
          created_at?: string
          created_by?: string
          iban?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          is_rejected?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      building_contacts: {
        Row: {
          building_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          phone: string
          rating: number
          specialty: string
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          phone: string
          rating?: number
          specialty?: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          phone?: string
          rating?: number
          specialty?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_contacts_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_documents: {
        Row: {
          building_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder: string
          id: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          building_id: string
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          folder?: string
          id?: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          building_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder?: string
          id?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_documents_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_meeting_minutes: {
        Row: {
          building_id: string
          content: string | null
          created_at: string
          created_by: string
          id: string
          meeting_date: string
          pdf_file_name: string | null
          pdf_file_path: string | null
          pdf_file_size: number | null
          title: string
          updated_at: string
        }
        Insert: {
          building_id: string
          content?: string | null
          created_at?: string
          created_by: string
          id?: string
          meeting_date: string
          pdf_file_name?: string | null
          pdf_file_path?: string | null
          pdf_file_size?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          content?: string | null
          created_at?: string
          created_by?: string
          id?: string
          meeting_date?: string
          pdf_file_name?: string | null
          pdf_file_path?: string | null
          pdf_file_size?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_meeting_minutes_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      building_messages: {
        Row: {
          building_id: string
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          parent_id: string | null
          recipient_user_id: string | null
          sender_name: string
          sender_role: string
          sender_user_id: string
          subject: string | null
          unit_id: string | null
        }
        Insert: {
          building_id: string
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          parent_id?: string | null
          recipient_user_id?: string | null
          sender_name: string
          sender_role?: string
          sender_user_id: string
          subject?: string | null
          unit_id?: string | null
        }
        Update: {
          building_id?: string
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          parent_id?: string | null
          recipient_user_id?: string | null
          sender_name?: string
          sender_role?: string
          sender_user_id?: string
          subject?: string | null
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "building_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      building_payment_policies: {
        Row: {
          building_id: string
          created_at: string
          early_pay_auto_apply: boolean
          early_pay_days: number
          early_pay_discount_percent: number
          early_pay_enabled: boolean
          id: string
          late_grace_days: number
          late_penalty_auto_apply: boolean
          late_penalty_enabled: boolean
          late_penalty_max_months: number
          late_penalty_percent_per_month: number
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          early_pay_auto_apply?: boolean
          early_pay_days?: number
          early_pay_discount_percent?: number
          early_pay_enabled?: boolean
          id?: string
          late_grace_days?: number
          late_penalty_auto_apply?: boolean
          late_penalty_enabled?: boolean
          late_penalty_max_months?: number
          late_penalty_percent_per_month?: number
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          early_pay_auto_apply?: boolean
          early_pay_days?: number
          early_pay_discount_percent?: number
          early_pay_enabled?: boolean
          id?: string
          late_grace_days?: number
          late_penalty_auto_apply?: boolean
          late_penalty_enabled?: boolean
          late_penalty_max_months?: number
          late_penalty_percent_per_month?: number
          updated_at?: string
        }
        Relationships: []
      }
      building_poll_votes: {
        Row: {
          building_id: string
          created_at: string
          id: string
          poll_id: string
          selected_option: number
          voter_hash: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          poll_id: string
          selected_option: number
          voter_hash: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          poll_id?: string
          selected_option?: number
          voter_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_poll_votes_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "building_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "building_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      building_polls: {
        Row: {
          building_id: string
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          is_active: boolean
          options: Json
          question: string
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          question: string
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_polls_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string
          default_charge_amount: number
          default_extra_charge_amount: number
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
          default_charge_amount?: number
          default_extra_charge_amount?: number
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
          default_charge_amount?: number
          default_extra_charge_amount?: number
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
      customer_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_attachments: {
        Row: {
          building_id: string
          created_at: string
          expense_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          expense_id: string
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          expense_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_attachments_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_attachments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
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
      expense_unit_shares: {
        Row: {
          allocated_amount: number
          building_id: string
          created_at: string
          expense_id: string
          id: string
          owner_name: string | null
          resident_name: string | null
          unit_id: string
        }
        Insert: {
          allocated_amount?: number
          building_id: string
          created_at?: string
          expense_id: string
          id?: string
          owner_name?: string | null
          resident_name?: string | null
          unit_id: string
        }
        Update: {
          allocated_amount?: number
          building_id?: string
          created_at?: string
          expense_id?: string
          id?: string
          owner_name?: string | null
          resident_name?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_unit_shares_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_unit_shares_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_unit_shares_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
      manager_roles: {
        Row: {
          building_id: string
          created_at: string
          id: string
          is_system: boolean
          label: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
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
          role_id: string | null
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
          role_id?: string | null
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
          role_id?: string | null
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
            foreignKeyName: "managers_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "manager_roles"
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
      notification_reads: {
        Row: {
          building_id: string
          id: string
          notification_id: string
          notification_type: string
          read_at: string
          user_id: string
        }
        Insert: {
          building_id: string
          id?: string
          notification_id: string
          notification_type: string
          read_at?: string
          user_id: string
        }
        Update: {
          building_id?: string
          id?: string
          notification_id?: string
          notification_type?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
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
          owner_name: string | null
          payment_date: string
          resident_name: string | null
          unit_id: string | null
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
          owner_name?: string | null
          payment_date?: string
          resident_name?: string | null
          unit_id?: string | null
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
          owner_name?: string | null
          payment_date?: string
          resident_name?: string | null
          unit_id?: string | null
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
      platform_settings: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: []
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
      reservation_venues: {
        Row: {
          building_id: string
          created_at: string
          description: string | null
          exclusive: boolean
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          description?: string | null
          exclusive?: boolean
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          description?: string | null
          exclusive?: boolean
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          building_id: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          is_exclusive: boolean
          manager_note: string | null
          requester_name: string
          requester_user_id: string | null
          reservation_date: string
          reviewed_at: string | null
          reviewed_by: string | null
          start_time: string
          status: Database["public"]["Enums"]["reservation_status"]
          unit_id: string | null
          updated_at: string
          venue_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          is_exclusive?: boolean
          manager_note?: string | null
          requester_name: string
          requester_user_id?: string | null
          reservation_date: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["reservation_status"]
          unit_id?: string | null
          updated_at?: string
          venue_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          is_exclusive?: boolean
          manager_note?: string | null
          requester_name?: string
          requester_user_id?: string | null
          reservation_date?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          unit_id?: string | null
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "reservation_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_credit_requests: {
        Row: {
          admin_note: string | null
          amount: number | null
          authority: string | null
          building_id: string
          created_at: string
          gateway: string | null
          id: string
          manager_note: string | null
          package_count: number
          paid_at: string | null
          ref_id: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number | null
          authority?: string | null
          building_id: string
          created_at?: string
          gateway?: string | null
          id?: string
          manager_note?: string | null
          package_count: number
          paid_at?: string | null
          ref_id?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount?: number | null
          authority?: string | null
          building_id?: string
          created_at?: string
          gateway?: string | null
          id?: string
          manager_note?: string | null
          package_count?: number
          paid_at?: string | null
          ref_id?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          building_id: string
          error_message: string | null
          id: string
          message_body: string
          provider: string
          provider_message_id: string | null
          recipient_name: string | null
          recipient_phone: string
          recipient_role: string | null
          sent_at: string
          status: string
          template_key: string
          unit_id: string | null
        }
        Insert: {
          building_id: string
          error_message?: string | null
          id?: string
          message_body: string
          provider: string
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone: string
          recipient_role?: string | null
          sent_at?: string
          status?: string
          template_key: string
          unit_id?: string | null
        }
        Update: {
          building_id?: string
          error_message?: string | null
          id?: string
          message_body?: string
          provider?: string
          provider_message_id?: string | null
          recipient_name?: string | null
          recipient_phone?: string
          recipient_role?: string | null
          sent_at?: string
          status?: string
          template_key?: string
          unit_id?: string | null
        }
        Relationships: []
      }
      sms_packages: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          package_count: number
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          package_count: number
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          package_count?: number
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_settings: {
        Row: {
          active_provider: string
          balance_reminder_enabled: boolean
          balance_reminder_recipient: string
          building_id: string
          created_at: string
          debt_auto_schedule_day: number
          debt_auto_schedule_enabled: boolean
          debt_auto_schedule_hour: number
          debt_report_enabled: boolean
          debt_report_recipient: string
          id: string
          is_enabled: boolean
          kavenegar_api_key: string | null
          kavenegar_sender: string | null
          melipayamak_password: string | null
          melipayamak_sender: string | null
          melipayamak_username: string | null
          payment_thanks_enabled: boolean
          payment_thanks_recipient: string
          reservation_enabled: boolean
          reservation_recipient: string
          smsir_api_key: string | null
          smsir_sender: string | null
          updated_at: string
        }
        Insert: {
          active_provider?: string
          balance_reminder_enabled?: boolean
          balance_reminder_recipient?: string
          building_id: string
          created_at?: string
          debt_auto_schedule_day?: number
          debt_auto_schedule_enabled?: boolean
          debt_auto_schedule_hour?: number
          debt_report_enabled?: boolean
          debt_report_recipient?: string
          id?: string
          is_enabled?: boolean
          kavenegar_api_key?: string | null
          kavenegar_sender?: string | null
          melipayamak_password?: string | null
          melipayamak_sender?: string | null
          melipayamak_username?: string | null
          payment_thanks_enabled?: boolean
          payment_thanks_recipient?: string
          reservation_enabled?: boolean
          reservation_recipient?: string
          smsir_api_key?: string | null
          smsir_sender?: string | null
          updated_at?: string
        }
        Update: {
          active_provider?: string
          balance_reminder_enabled?: boolean
          balance_reminder_recipient?: string
          building_id?: string
          created_at?: string
          debt_auto_schedule_day?: number
          debt_auto_schedule_enabled?: boolean
          debt_auto_schedule_hour?: number
          debt_report_enabled?: boolean
          debt_report_recipient?: string
          id?: string
          is_enabled?: boolean
          kavenegar_api_key?: string | null
          kavenegar_sender?: string | null
          melipayamak_password?: string | null
          melipayamak_sender?: string | null
          melipayamak_username?: string | null
          payment_thanks_enabled?: boolean
          payment_thanks_recipient?: string
          reservation_enabled?: boolean
          reservation_recipient?: string
          smsir_api_key?: string | null
          smsir_sender?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          body: string
          building_id: string
          created_at: string
          id: string
          is_active: boolean
          template_key: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          building_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          template_key: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          building_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          template_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          attachment_url: string | null
          building_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_name: string
          sender_role: string
          sender_user_id: string
          ticket_id: string
        }
        Insert: {
          attachment_url?: string | null
          building_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_name: string
          sender_role: string
          sender_user_id: string
          ticket_id: string
        }
        Update: {
          attachment_url?: string | null
          building_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_name?: string
          sender_role?: string
          sender_user_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          building_id: string
          category: Database["public"]["Enums"]["ticket_category"]
          created_at: string
          created_by: string
          creator_name: string
          description: string
          id: string
          last_reply_at: string
          last_reply_by_role: string
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          building_id: string
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by: string
          creator_name: string
          description: string
          id?: string
          last_reply_at?: string
          last_reply_by_role?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          category?: Database["public"]["Enums"]["ticket_category"]
          created_at?: string
          created_by?: string
          creator_name?: string
          description?: string
          id?: string
          last_reply_at?: string
          last_reply_by_role?: string
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_charges: {
        Row: {
          amount: number
          building_id: string
          created_at: string
          description: string | null
          fund_type: Database["public"]["Enums"]["fund_type"]
          id: string
          month: number
          owner_name: string | null
          resident_name: string | null
          unit_id: string
          year: number
        }
        Insert: {
          amount?: number
          building_id: string
          created_at?: string
          description?: string | null
          fund_type?: Database["public"]["Enums"]["fund_type"]
          id?: string
          month: number
          owner_name?: string | null
          resident_name?: string | null
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
          owner_name?: string | null
          resident_name?: string | null
          unit_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "unit_charges_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_charges_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      unit_document_access_blocks: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          building_id: string
          id: string
          unit_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          building_id: string
          id?: string
          unit_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          building_id?: string
          id?: string
          unit_id?: string
        }
        Relationships: []
      }
      unit_occupancy_history: {
        Row: {
          building_id: string
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          note: string | null
          person_name: string
          person_phone: string | null
          person_type: string
          start_date: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          note?: string | null
          person_name: string
          person_phone?: string | null
          person_type: string
          start_date?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          note?: string | null
          person_name?: string
          person_phone?: string | null
          person_type?: string
          start_date?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_occupancy_history_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_occupancy_history_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
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
          late_penalty_exempt: boolean
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
          late_penalty_exempt?: boolean
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
          late_penalty_exempt?: boolean
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
      utility_readings: {
        Row: {
          amount: number
          building_id: string
          created_at: string
          description: string | null
          id: string
          quantity: number
          reading_date: string
          updated_at: string
          utility_type: string
        }
        Insert: {
          amount?: number
          building_id: string
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          reading_date?: string
          updated_at?: string
          utility_type: string
        }
        Update: {
          amount?: number
          building_id?: string
          created_at?: string
          description?: string | null
          id?: string
          quantity?: number
          reading_date?: string
          updated_at?: string
          utility_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "utility_readings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
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
      get_voter_hash: { Args: { _poll_id: string }; Returns: string }
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
      resident_pay_and_clear: {
        Args: {
          _building_id: string
          _charge_ids_to_clear: string[]
          _payments: Json
          _unit_id: string
        }
        Returns: undefined
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
      reservation_status: "pending" | "approved" | "rejected"
      ticket_category: "financial" | "technical" | "support" | "other"
      ticket_priority: "low" | "medium" | "high" | "urgent"
      ticket_status: "open" | "in_progress" | "answered" | "closed"
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
      reservation_status: ["pending", "approved", "rejected"],
      ticket_category: ["financial", "technical", "support", "other"],
      ticket_priority: ["low", "medium", "high", "urgent"],
      ticket_status: ["open", "in_progress", "answered", "closed"],
    },
  },
} as const
