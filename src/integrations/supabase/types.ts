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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alert_log: {
        Row: {
          alert_date: string
          alert_type: string
          id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          alert_date: string
          alert_type: string
          id?: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          alert_date?: string
          alert_type?: string
          id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      alert_settings: {
        Row: {
          alert_time: string | null
          alert_types: Json | null
          email_enabled: boolean | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_time?: string | null
          alert_types?: Json | null
          email_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_time?: string | null
          alert_types?: Json | null
          email_enabled?: boolean | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          ano: number
          category_id: string
          created_at: string
          deleted_at: string | null
          id: string
          limite_valor: number
          mes: number
          rollover_cap: number | null
          rollover_policy: Database["public"]["Enums"]["rollover_policy"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ano: number
          category_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          limite_valor: number
          mes: number
          rollover_cap?: number | null
          rollover_policy?: Database["public"]["Enums"]["rollover_policy"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ano?: number
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          limite_valor?: number
          mes?: number
          rollover_cap?: number | null
          rollover_policy?: Database["public"]["Enums"]["rollover_policy"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      card_statement_lines: {
        Row: {
          statement_id: string
          transaction_id: string
        }
        Insert: {
          statement_id: string
          transaction_id: string
        }
        Update: {
          statement_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_statement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "card_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_statement_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      card_statements: {
        Row: {
          abre: string
          created_at: string
          fecha: string
          id: string
          status: Database["public"]["Enums"]["statement_status"]
          total: number
          user_id: string
          vence: string
          wallet_id: string
        }
        Insert: {
          abre: string
          created_at?: string
          fecha: string
          id?: string
          status?: Database["public"]["Enums"]["statement_status"]
          total?: number
          user_id: string
          vence: string
          wallet_id: string
        }
        Update: {
          abre?: string
          created_at?: string
          fecha?: string
          id?: string
          status?: Database["public"]["Enums"]["statement_status"]
          total?: number
          user_id?: string
          vence?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "card_statements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["category_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["category_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ff_conversation_messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          tenant_id: string
          tool_call_id: string | null
          tool_calls: Json | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          tenant_id: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          tool_call_id?: string | null
          tool_calls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ff_conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ff_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_conversation_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_conversations: {
        Row: {
          channel: string
          created_at: string
          id: string
          tenant_id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_events: {
        Row: {
          all_day: boolean
          created_at: string
          created_by: string
          description: string | null
          end_at: string | null
          google_calendar_id: string | null
          google_event_id: string | null
          id: string
          location: string | null
          priority: string
          source: string
          start_at: string
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          end_at?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          priority?: string
          source?: string
          start_at: string
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string | null
          google_calendar_id?: string | null
          google_event_id?: string | null
          id?: string
          location?: string | null
          priority?: string
          source?: string
          start_at?: string
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_habit_logs: {
        Row: {
          created_at: string
          habit_id: string
          id: string
          log_date: string
          tenant_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          habit_id: string
          id?: string
          log_date?: string
          tenant_id: string
          user_id: string
          value?: number
        }
        Update: {
          created_at?: string
          habit_id?: string
          id?: string
          log_date?: string
          tenant_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ff_habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "ff_habits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ff_habit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_habits: {
        Row: {
          active: boolean
          cadence: string
          created_at: string
          created_by: string
          id: string
          target_type: string
          target_value: number
          tenant_id: string
          times_per_cadence: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          cadence?: string
          created_at?: string
          created_by: string
          id?: string
          target_type?: string
          target_value?: number
          tenant_id: string
          times_per_cadence?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          cadence?: string
          created_at?: string
          created_by?: string
          id?: string
          target_type?: string
          target_value?: number
          tenant_id?: string
          times_per_cadence?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_habits_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_integrations_google: {
        Row: {
          access_token: string | null
          created_at: string
          email: string | null
          expiry: string | null
          id: string
          last_sync_at: string | null
          refresh_token: string | null
          scope: string | null
          sync_token: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expiry?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          sync_token?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          email?: string | null
          expiry?: string | null
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          scope?: string | null
          sync_token?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_integrations_google_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_memory_items: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          source: string
          tenant_id: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          source?: string
          tenant_id: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          source?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_memory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          last_seen_at: string | null
          p256dh: string
          tenant_id: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          p256dh: string
          tenant_id: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          p256dh?: string
          tenant_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_push_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_reminders: {
        Row: {
          attempt_count: number
          channel: string
          created_at: string
          created_by: string
          id: string
          last_attempt_at: string | null
          remind_at: string
          sent_at: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          channel?: string
          created_at?: string
          created_by: string
          id?: string
          last_attempt_at?: string | null
          remind_at: string
          sent_at?: string | null
          status?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          last_attempt_at?: string | null
          remind_at?: string
          sent_at?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          source: string
          status: string
          tags: string[]
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          source?: string
          status?: string
          tags?: string[]
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          source?: string
          status?: string
          tags?: string[]
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ff_user_phones: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_primary: boolean
          phone_e164: string
          tenant_id: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_primary?: boolean
          phone_e164: string
          tenant_id: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_primary?: boolean
          phone_e164?: string
          tenant_id?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      ff_user_profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          full_name: string | null
          guided_tour_completed: boolean | null
          guided_tour_skipped: boolean | null
          guided_tour_step: number | null
          id: string
          interaction_count: number
          last_interaction_at: string | null
          locale: string
          nickname: string | null
          onboarding_completed: boolean
          onboarding_step: string | null
          preferences: Json
          tenant_id: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          guided_tour_completed?: boolean | null
          guided_tour_skipped?: boolean | null
          guided_tour_step?: number | null
          id?: string
          interaction_count?: number
          last_interaction_at?: string | null
          locale?: string
          nickname?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string | null
          preferences?: Json
          tenant_id: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          full_name?: string | null
          guided_tour_completed?: boolean | null
          guided_tour_skipped?: boolean | null
          guided_tour_step?: number | null
          id?: string
          interaction_count?: number
          last_interaction_at?: string | null
          locale?: string
          nickname?: string | null
          onboarding_completed?: boolean
          onboarding_step?: string | null
          preferences?: Json
          tenant_id?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ff_user_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          prazo: string | null
          updated_at: string
          user_id: string
          valor_meta: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          prazo?: string | null
          updated_at?: string
          user_id: string
          valor_meta: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          prazo?: string | null
          updated_at?: string
          user_id?: string
          valor_meta?: number
        }
        Relationships: []
      }
      goals_contribs: {
        Row: {
          created_at: string
          data: string
          goal_id: string
          id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          goal_id: string
          id?: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          goal_id?: string
          id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "goals_contribs_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string | null
          error_log: Json | null
          filename: string
          id: string
          rows_imported: number
          rows_skipped: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          filename: string
          id?: string
          rows_imported: number
          rows_skipped?: number | null
          status: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          filename?: string
          id?: string
          rows_imported?: number
          rows_skipped?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      import_presets: {
        Row: {
          column_mapping: Json
          created_at: string | null
          id: string
          is_default: boolean | null
          nome: string
          user_id: string
        }
        Insert: {
          column_mapping: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nome: string
          user_id: string
        }
        Update: {
          column_mapping?: Json
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nome?: string
          user_id?: string
        }
        Relationships: []
      }
      investment_contribs: {
        Row: {
          created_at: string
          data: string
          id: string
          investment_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          investment_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          investment_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "investment_contribs_investment_id_fkey"
            columns: ["investment_id"]
            isOneToOne: false
            referencedRelation: "investments"
            referencedColumns: ["id"]
          },
        ]
      }
      investments: {
        Row: {
          corretora: string | null
          created_at: string
          deleted_at: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          corretora?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          tipo: string
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          corretora?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "investments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          mensagem: string | null
          nome: string
          origem: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          mensagem?: string | null
          nome: string
          origem?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          mensagem?: string | null
          nome?: string
          origem?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_default: boolean
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_default?: boolean
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          month: number
          status: Database["public"]["Enums"]["period_status"]
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          month: number
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          month?: number
          status?: Database["public"]["Enums"]["period_status"]
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recurring_transaction_history: {
        Row: {
          data_geracao: string | null
          data_prevista: string
          erro_msg: string | null
          id: string
          recurring_transaction_id: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          data_geracao?: string | null
          data_prevista: string
          erro_msg?: string | null
          id?: string
          recurring_transaction_id: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          data_geracao?: string | null
          data_prevista?: string
          erro_msg?: string | null
          id?: string
          recurring_transaction_id?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transaction_history_recurring_transaction_id_fkey"
            columns: ["recurring_transaction_id"]
            isOneToOne: false
            referencedRelation: "recurring_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transaction_history_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          ativo: boolean | null
          category_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          deleted_at: string | null
          descricao: string
          dia_referencia: number
          frequencia: Database["public"]["Enums"]["recurrence_frequency"]
          id: string
          natureza: string | null
          payment_method_id: string | null
          proxima_ocorrencia: string
          tipo: Database["public"]["Enums"]["transaction_type"]
          ultima_geracao: string | null
          updated_at: string | null
          user_id: string
          valor: number
          wallet_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          category_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          deleted_at?: string | null
          descricao: string
          dia_referencia: number
          frequencia: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          natureza?: string | null
          payment_method_id?: string | null
          proxima_ocorrencia: string
          tipo: Database["public"]["Enums"]["transaction_type"]
          ultima_geracao?: string | null
          updated_at?: string | null
          user_id: string
          valor: number
          wallet_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          category_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          deleted_at?: string | null
          descricao?: string
          dia_referencia?: number
          frequencia?: Database["public"]["Enums"]["recurrence_frequency"]
          id?: string
          natureza?: string | null
          payment_method_id?: string | null
          proxima_ocorrencia?: string
          tipo?: Database["public"]["Enums"]["transaction_type"]
          ultima_geracao?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "recurring_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          category_id: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
          fingerprint: string | null
          forma_pagamento: string | null
          grupo_parcelamento: string | null
          id: string
          mes_referencia: string
          mes_referencia_int: number | null
          natureza: string | null
          parcela_numero: number | null
          parcela_total: number | null
          payment_method_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
          valor: number
          valor_parcela: number | null
          valor_total_parcelado: number | null
          wallet_id: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          data: string
          deleted_at?: string | null
          descricao: string
          fingerprint?: string | null
          forma_pagamento?: string | null
          grupo_parcelamento?: string | null
          id?: string
          mes_referencia: string
          mes_referencia_int?: number | null
          natureza?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          payment_method_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tipo: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
          valor: number
          valor_parcela?: number | null
          valor_total_parcelado?: number | null
          wallet_id?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string
          fingerprint?: string | null
          forma_pagamento?: string | null
          grupo_parcelamento?: string | null
          id?: string
          mes_referencia?: string
          mes_referencia_int?: number | null
          natureza?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          payment_method_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          tipo?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
          valor?: number
          valor_parcela?: number | null
          valor_total_parcelado?: number | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      transfers: {
        Row: {
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string | null
          from_wallet_id: string
          id: string
          to_wallet_id: string
          updated_at: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          data: string
          deleted_at?: string | null
          descricao?: string | null
          from_wallet_id: string
          id?: string
          to_wallet_id: string
          updated_at?: string
          user_id: string
          valor: number
        }
        Update: {
          created_at?: string
          data?: string
          deleted_at?: string | null
          descricao?: string | null
          from_wallet_id?: string
          id?: string
          to_wallet_id?: string
          updated_at?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transfers_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "transfers_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfers_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "v_wallet_balance"
            referencedColumns: ["wallet_id"]
          },
          {
            foreignKeyName: "transfers_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          budget_mode: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_mode?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_mode?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          ativo: boolean
          created_at: string
          deleted_at: string | null
          dia_fechamento: number | null
          dia_vencimento: number | null
          id: string
          instituicao: string | null
          limite_credito: number | null
          limite_emergencia: number | null
          nome: string
          saldo_inicial: number | null
          tipo: Database["public"]["Enums"]["wallet_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          id?: string
          instituicao?: string | null
          limite_credito?: number | null
          limite_emergencia?: number | null
          nome: string
          saldo_inicial?: number | null
          tipo: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          deleted_at?: string | null
          dia_fechamento?: number | null
          dia_vencimento?: number | null
          id?: string
          instituicao?: string | null
          limite_credito?: number | null
          limite_emergencia?: number | null
          nome?: string
          saldo_inicial?: number | null
          tipo?: Database["public"]["Enums"]["wallet_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_balance_evolution: {
        Row: {
          despesas: number | null
          mes_referencia: string | null
          receitas: number | null
          saldo_mensal: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_category_spending: {
        Row: {
          category_id: string | null
          category_name: string | null
          category_type: Database["public"]["Enums"]["category_type"] | null
          mes_referencia: string | null
          total_pago: number | null
          total_transacoes: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      v_monthly_summary: {
        Row: {
          mes_referencia: string | null
          tipo: Database["public"]["Enums"]["transaction_type"] | null
          total_pago: number | null
          total_pendente: number | null
          total_transacoes: number | null
          transacoes_pagas: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_wallet_balance: {
        Row: {
          saldo: number | null
          user_id: string | null
          wallet_id: string | null
          wallet_nome: string | null
          wallet_tipo: Database["public"]["Enums"]["wallet_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      aplicar_rollover: {
        Args: { p_month: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      calculate_next_occurrence: {
        Args: {
          p_current_date: string
          p_dia_referencia: number
          p_frequencia: Database["public"]["Enums"]["recurrence_frequency"]
        }
        Returns: string
      }
      close_card_statement: {
        Args: { p_statement_id: string }
        Returns: undefined
      }
      fechar_mensal: {
        Args: { p_month: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      ff_complete_task: { Args: { p_task_id: string }; Returns: undefined }
      pay_card_statement: {
        Args: {
          p_payment_date: string
          p_payment_wallet_id: string
          p_statement_id: string
        }
        Returns: undefined
      }
      process_recurring_transactions: {
        Args: never
        Returns: {
          failed_count: number
          processed_count: number
        }[]
      }
      reabrir_mensal: {
        Args: { p_month: number; p_user_id: string; p_year: number }
        Returns: undefined
      }
      realizado_categoria: {
        Args: {
          p_category_id: string
          p_month: number
          p_user_id: string
          p_year: number
        }
        Returns: number
      }
      yyyymm: { Args: { d: string }; Returns: number }
    }
    Enums: {
      category_type:
        | "fixa"
        | "variavel"
        | "investimento"
        | "divida"
        | "receita"
        | "despesa"
      period_status: "open" | "closed"
      recurrence_frequency:
        | "semanal"
        | "quinzenal"
        | "mensal"
        | "bimestral"
        | "trimestral"
        | "semestral"
        | "anual"
      rollover_policy: "none" | "carry_over" | "clamp"
      statement_status: "aberta" | "fechada" | "paga"
      transaction_status: "paga" | "pendente"
      transaction_type: "despesa" | "receita"
      wallet_type: "conta" | "cartao"
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
      category_type: [
        "fixa",
        "variavel",
        "investimento",
        "divida",
        "receita",
        "despesa",
      ],
      period_status: ["open", "closed"],
      recurrence_frequency: [
        "semanal",
        "quinzenal",
        "mensal",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
      ],
      rollover_policy: ["none", "carry_over", "clamp"],
      statement_status: ["aberta", "fechada", "paga"],
      transaction_status: ["paga", "pendente"],
      transaction_type: ["despesa", "receita"],
      wallet_type: ["conta", "cartao"],
    },
  },
} as const
