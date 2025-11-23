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
      budgets: {
        Row: {
          ano: number
          category_id: string
          created_at: string
          deleted_at: string | null
          id: string
          limite_valor: number
          mes: number
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
          tipo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          corretora?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          tipo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          corretora?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string
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
      transactions: {
        Row: {
          category_id: string
          created_at: string
          data: string
          deleted_at: string | null
          descricao: string
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
      v_wallet_balance: {
        Row: {
          saldo: number | null
          user_id: string | null
          wallet_id: string | null
          wallet_nome: string | null
          wallet_tipo: Database["public"]["Enums"]["wallet_type"] | null
        }
        Insert: {
          saldo?: never
          user_id?: string | null
          wallet_id?: string | null
          wallet_nome?: string | null
          wallet_tipo?: Database["public"]["Enums"]["wallet_type"] | null
        }
        Update: {
          saldo?: never
          user_id?: string | null
          wallet_id?: string | null
          wallet_nome?: string | null
          wallet_tipo?: Database["public"]["Enums"]["wallet_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
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
    }
    Enums: {
      category_type:
        | "fixa"
        | "variavel"
        | "investimento"
        | "divida"
        | "receita"
        | "despesa"
      recurrence_frequency:
        | "semanal"
        | "quinzenal"
        | "mensal"
        | "bimestral"
        | "trimestral"
        | "semestral"
        | "anual"
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
      recurrence_frequency: [
        "semanal",
        "quinzenal",
        "mensal",
        "bimestral",
        "trimestral",
        "semestral",
        "anual",
      ],
      statement_status: ["aberta", "fechada", "paga"],
      transaction_status: ["paga", "pendente"],
      transaction_type: ["despesa", "receita"],
      wallet_type: ["conta", "cartao"],
    },
  },
} as const
