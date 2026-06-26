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
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          country_code: string
          created_at: string
          display_name: string
          id: string
          is_blocked: boolean
          kori_balance: number
          kori_locked: number
          phone_number: string
          referral_code: string
          referred_by: string | null
          solana_wallet_pubkey: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          display_name: string
          id: string
          is_blocked?: boolean
          kori_balance?: number
          kori_locked?: number
          phone_number: string
          referral_code: string
          referred_by?: string | null
          solana_wallet_pubkey?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          display_name?: string
          id?: string
          is_blocked?: boolean
          kori_balance?: number
          kori_locked?: number
          phone_number?: string
          referral_code?: string
          referred_by?: string | null
          solana_wallet_pubkey?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          user_id?: string
        }
        Relationships: []
      }
      referral_commissions: {
        Row: {
          amount_kori: number
          created_at: string
          filleul_id: string
          id: string
          parrain_id: string
          source_id: string | null
          source_type: string
        }
        Insert: {
          amount_kori: number
          created_at?: string
          filleul_id: string
          id?: string
          parrain_id: string
          source_id?: string | null
          source_type: string
        }
        Update: {
          amount_kori?: number
          created_at?: string
          filleul_id?: string
          id?: string
          parrain_id?: string
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_commissions_filleul_id_fkey"
            columns: ["filleul_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_commissions_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount_cfa: number | null
          amount_kori: number
          created_at: string
          id: string
          provider_payload: Json | null
          provider_reference: string | null
          provider_tx_id: string | null
          recipient_phone: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_cfa?: number | null
          amount_kori: number
          created_at?: string
          id?: string
          provider_payload?: Json | null
          provider_reference?: string | null
          provider_tx_id?: string | null
          recipient_phone?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_cfa?: number | null
          amount_kori?: number
          created_at?: string
          id?: string
          provider_payload?: Json | null
          provider_reference?: string | null
          provider_tx_id?: string | null
          recipient_phone?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      vaults: {
        Row: {
          amount_locked: number
          created_at: string
          duration_days: number
          end_date: string
          expected_profit: number
          id: string
          payout_processed: boolean
          start_date: string
          status: string
          user_id: string
          yield_rate: number
        }
        Insert: {
          amount_locked: number
          created_at?: string
          duration_days: number
          end_date: string
          expected_profit: number
          id?: string
          payout_processed?: boolean
          start_date?: string
          status?: string
          user_id: string
          yield_rate: number
        }
        Update: {
          amount_locked?: number
          created_at?: string
          duration_days?: number
          end_date?: string
          expected_profit?: number
          id?: string
          payout_processed?: boolean
          start_date?: string
          status?: string
          user_id?: string
          yield_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "vaults_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          phone_lookup: string | null
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at?: string
          id?: string
          kind: string
          phone_lookup?: string | null
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          phone_lookup?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      wheel_logs: {
        Row: {
          id: string
          played_at: string
          reward_amount: number
          reward_type: string
          user_id: string
        }
        Insert: {
          id?: string
          played_at?: string
          reward_amount?: number
          reward_type: string
          user_id: string
        }
        Update: {
          id?: string
          played_at?: string
          reward_amount?: number
          reward_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wheel_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_confirm_deposit: {
        Args: { _admin: string; _tx: string }
        Returns: Json
      }
      admin_process_withdrawal: {
        Args: { _admin: string; _approve: boolean; _notes: string; _tx: string }
        Returns: Json
      }
      check_rate_limit: {
        Args: {
          _action: string
          _max: number
          _user: string
          _window_seconds: number
        }
        Returns: boolean
      }
      claim_vault: { Args: { _user: string; _vault: string }; Returns: Json }
      create_vault: {
        Args: { _amount: number; _days: number; _user: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initiate_withdrawal: {
        Args: { _amount_cfa: number; _phone: string; _user: string }
        Returns: Json
      }
      notchpay_credit_deposit: {
        Args: { _payload: Json; _reference: string }
        Returns: Json
      }
      spin_wheel: { Args: { _user: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
      tx_status: "PENDING" | "SUCCESS" | "REJECTED"
      tx_type:
        | "DEPOSIT"
        | "WITHDRAWAL"
        | "COMMISSION_DEP"
        | "COMMISSION_BONUS"
        | "WHEEL_REWARD"
        | "VAULT_LOCK"
        | "VAULT_PAYOUT"
        | "REFERRAL_BONUS"
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
      app_role: ["admin", "user"],
      tx_status: ["PENDING", "SUCCESS", "REJECTED"],
      tx_type: [
        "DEPOSIT",
        "WITHDRAWAL",
        "COMMISSION_DEP",
        "COMMISSION_BONUS",
        "WHEEL_REWARD",
        "VAULT_LOCK",
        "VAULT_PAYOUT",
        "REFERRAL_BONUS",
      ],
    },
  },
} as const
