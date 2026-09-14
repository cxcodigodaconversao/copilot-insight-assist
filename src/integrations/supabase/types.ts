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
      calls: {
        Row: {
          cliente: string
          closer_id: string | null
          data_reuniao_agendada: string | null
          email_lead: string
          encerrada_em: string | null
          forma_pagamento: string | null
          funil: string
          id: string
          iniciada_em: string
          nome_lead: string
          notas_crm: string
          objetivo: string
          observacoes: string
          oferta_id: string | null
          origem_lead: string
          resultado: string
          resumo_falas_antigas: string | null
          resumo_final: Json | null
          sdr_id: string | null
          status_reuniao: string
          telefone_lead: string
          time: string
          tipo: string
          valor_coletado: number
          valor_pendente: number
          valor_vendido: number
          vendedor_id: string
        }
        Insert: {
          cliente?: string
          closer_id?: string | null
          data_reuniao_agendada?: string | null
          email_lead?: string
          encerrada_em?: string | null
          forma_pagamento?: string | null
          funil?: string
          id?: string
          iniciada_em?: string
          nome_lead?: string
          notas_crm?: string
          objetivo?: string
          observacoes?: string
          oferta_id?: string | null
          origem_lead?: string
          resultado?: string
          resumo_falas_antigas?: string | null
          resumo_final?: Json | null
          sdr_id?: string | null
          status_reuniao?: string
          telefone_lead?: string
          time?: string
          tipo?: string
          valor_coletado?: number
          valor_pendente?: number
          valor_vendido?: number
          vendedor_id: string
        }
        Update: {
          cliente?: string
          closer_id?: string | null
          data_reuniao_agendada?: string | null
          email_lead?: string
          encerrada_em?: string | null
          forma_pagamento?: string | null
          funil?: string
          id?: string
          iniciada_em?: string
          nome_lead?: string
          notas_crm?: string
          objetivo?: string
          observacoes?: string
          oferta_id?: string | null
          origem_lead?: string
          resultado?: string
          resumo_falas_antigas?: string | null
          resumo_final?: Json | null
          sdr_id?: string | null
          status_reuniao?: string
          telefone_lead?: string
          time?: string
          tipo?: string
          valor_coletado?: number
          valor_pendente?: number
          valor_vendido?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_closer_id_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      config_api: {
        Row: {
          chave: string
          descricao_ajuda: string
          valor: string
        }
        Insert: {
          chave: string
          descricao_ajuda?: string
          valor?: string
        }
        Update: {
          chave?: string
          descricao_ajuda?: string
          valor?: string
        }
        Relationships: []
      }
      convites: {
        Row: {
          convidado_por: string | null
          created_at: string
          email: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          convidado_por?: string | null
          created_at?: string
          email: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          convidado_por?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      falas: {
        Row: {
          call_id: string
          created_at: string
          falante: string
          id: string
          texto: string
        }
        Insert: {
          call_id: string
          created_at?: string
          falante?: string
          id?: string
          texto?: string
        }
        Update: {
          call_id?: string
          created_at?: string
          falante?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "falas_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      funis: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      objecoes: {
        Row: {
          ativo: boolean
          categoria: string
          como_quebrar: string
          created_at: string
          gatilho: string
          id: string
          oferta_id: string | null
          ordem: number
          pergunta_pronta: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          como_quebrar?: string
          created_at?: string
          gatilho?: string
          id?: string
          oferta_id?: string | null
          ordem?: number
          pergunta_pronta?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          como_quebrar?: string
          created_at?: string
          gatilho?: string
          id?: string
          oferta_id?: string | null
          ordem?: number
          pergunta_pronta?: string
        }
        Relationships: [
          {
            foreignKeyName: "objecoes_oferta_id_fkey"
            columns: ["oferta_id"]
            isOneToOne: false
            referencedRelation: "ofertas"
            referencedColumns: ["id"]
          },
        ]
      }
      ofertas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          diferenciais: string
          garantia: string
          id: string
          nome: string
          preco_condicoes: string
          publico_ideal: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          diferenciais?: string
          garantia?: string
          id?: string
          nome: string
          preco_condicoes?: string
          publico_ideal?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          diferenciais?: string
          garantia?: string
          id?: string
          nome?: string
          preco_condicoes?: string
          publico_ideal?: string
        }
        Relationships: []
      }
      origens: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      perfis_disc: {
        Row: {
          como_conduzir: string
          como_identificar: string
          evitar: string
          id: string
          tipo: string
        }
        Insert: {
          como_conduzir?: string
          como_identificar?: string
          evitar?: string
          id?: string
          tipo: string
        }
        Update: {
          como_conduzir?: string
          como_identificar?: string
          evitar?: string
          id?: string
          tipo?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id: string
          nome?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      regras_copiloto: {
        Row: {
          chave: string
          descricao_ajuda: string
          valor: string
        }
        Insert: {
          chave: string
          descricao_ajuda?: string
          valor?: string
        }
        Update: {
          chave?: string
          descricao_ajuda?: string
          valor?: string
        }
        Relationships: []
      }
      sugestoes: {
        Row: {
          call_id: string
          created_at: string
          fala_id: string | null
          id: string
          latencia_ms: number | null
          resposta: Json
        }
        Insert: {
          call_id: string
          created_at?: string
          fala_id?: string | null
          id?: string
          latencia_ms?: number | null
          resposta?: Json
        }
        Update: {
          call_id?: string
          created_at?: string
          fala_id?: string | null
          id?: string
          latencia_ms?: number | null
          resposta?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_fala_id_fkey"
            columns: ["fala_id"]
            isOneToOne: false
            referencedRelation: "falas"
            referencedColumns: ["id"]
          },
        ]
      }
      times: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      is_lider: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "lider" | "closer" | "sdr" | "adm"
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
      app_role: ["lider", "closer", "sdr", "adm"],
    },
  },
} as const
