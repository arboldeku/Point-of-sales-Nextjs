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
      audit_log: {
        Row: {
          action: string
          changes: Json | null
          id: string
          ip_address: string | null
          permission_check: Database["public"]["Enums"]["permission_check_enum"]
          resource_id: string | null
          resource_type: string
          timestamp: string | null
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          id?: string
          ip_address?: string | null
          permission_check: Database["public"]["Enums"]["permission_check_enum"]
          resource_id?: string | null
          resource_type: string
          timestamp?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          id?: string
          ip_address?: string | null
          permission_check?: Database["public"]["Enums"]["permission_check_enum"]
          resource_id?: string | null
          resource_type?: string
          timestamp?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_locks: {
        Row: {
          expires_at: string
          internal_sku: string
          lock_id: string
          locked_at: string
          qty: number
          session_id: string
        }
        Insert: {
          expires_at?: string
          internal_sku: string
          lock_id?: string
          locked_at?: string
          qty?: number
          session_id: string
        }
        Update: {
          expires_at?: string
          internal_sku?: string
          lock_id?: string
          locked_at?: string
          qty?: number
          session_id?: string
        }
        Relationships: []
      }
      coverage_by_set_rarity: {
        Row: {
          game: string
          owned: number | null
          pct: number | null
          rarity: string
          reference_source: string | null
          set_code: string
          set_name: string | null
          total: number | null
        }
        Insert: {
          game?: string
          owned?: number | null
          pct?: number | null
          rarity: string
          reference_source?: string | null
          set_code: string
          set_name?: string | null
          total?: number | null
        }
        Update: {
          game?: string
          owned?: number | null
          pct?: number | null
          rarity?: string
          reference_source?: string | null
          set_code?: string
          set_name?: string | null
          total?: number | null
        }
        Relationships: []
      }
      debug_log: {
        Row: {
          check_name: string | null
          created_at: string | null
          detail: string | null
          game: string
          row_count: number | null
          run_id: string | null
          severity: string | null
        }
        Insert: {
          check_name?: string | null
          created_at?: string | null
          detail?: string | null
          game?: string
          row_count?: number | null
          run_id?: string | null
          severity?: string | null
        }
        Update: {
          check_name?: string | null
          created_at?: string | null
          detail?: string | null
          game?: string
          row_count?: number | null
          run_id?: string | null
          severity?: string | null
        }
        Relationships: []
      }
      dim_product: {
        Row: {
          card_name: string | null
          cardmarket_id: string
          cn: string | null
          game: string
          has_reverse: boolean | null
          is_chi: boolean
          is_japanese: boolean | null
          product_metadata_quality: string | null
          rarity: string | null
          rarity_quality: string | null
          rarity_rule_applied: string | null
          set_code: string | null
          set_name: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id: string
          cn?: string | null
          game?: string
          has_reverse?: boolean | null
          is_chi?: boolean
          is_japanese?: boolean | null
          product_metadata_quality?: string | null
          rarity?: string | null
          rarity_quality?: string | null
          rarity_rule_applied?: string | null
          set_code?: string | null
          set_name?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string
          cn?: string | null
          game?: string
          has_reverse?: boolean | null
          is_chi?: boolean
          is_japanese?: boolean | null
          product_metadata_quality?: string | null
          rarity?: string | null
          rarity_quality?: string | null
          rarity_rule_applied?: string | null
          set_code?: string | null
          set_name?: string | null
        }
        Relationships: []
      }
      dim_variant: {
        Row: {
          cardmarket_id: string | null
          game: string
          has_reverse: boolean | null
          internal_sku: string
          is_reverse: boolean | null
          lang: string | null
          suffix: string | null
        }
        Insert: {
          cardmarket_id?: string | null
          game?: string
          has_reverse?: boolean | null
          internal_sku: string
          is_reverse?: boolean | null
          lang?: string | null
          suffix?: string | null
        }
        Update: {
          cardmarket_id?: string | null
          game?: string
          has_reverse?: boolean | null
          internal_sku?: string
          is_reverse?: boolean | null
          lang?: string | null
          suffix?: string | null
        }
        Relationships: []
      }
      fifo_cogs_clean: {
        Row: {
          cardmarket_id: string | null
          cogs_method: string | null
          cogs_quality: string | null
          cogs_total: number | null
          event_date: string | null
          event_date_type: string | null
          fifo_level: string | null
          game: string
          gross_margin_eur: number | null
          internal_sku: string | null
          qty: number | null
          rarity: string | null
          rule_version: string | null
          sale_channel: string | null
          sale_id: string
          sale_price: number | null
          sale_type: string | null
          source_system: string | null
        }
        Insert: {
          cardmarket_id?: string | null
          cogs_method?: string | null
          cogs_quality?: string | null
          cogs_total?: number | null
          event_date?: string | null
          event_date_type?: string | null
          fifo_level?: string | null
          game?: string
          gross_margin_eur?: number | null
          internal_sku?: string | null
          qty?: number | null
          rarity?: string | null
          rule_version?: string | null
          sale_channel?: string | null
          sale_id: string
          sale_price?: number | null
          sale_type?: string | null
          source_system?: string | null
        }
        Update: {
          cardmarket_id?: string | null
          cogs_method?: string | null
          cogs_quality?: string | null
          cogs_total?: number | null
          event_date?: string | null
          event_date_type?: string | null
          fifo_level?: string | null
          game?: string
          gross_margin_eur?: number | null
          internal_sku?: string | null
          qty?: number | null
          rarity?: string | null
          rule_version?: string | null
          sale_channel?: string | null
          sale_id?: string
          sale_price?: number | null
          sale_type?: string | null
          source_system?: string | null
        }
        Relationships: []
      }
      fifo_ledger_events: {
        Row: {
          cardmarket_id: string | null
          cogs_quality: string | null
          data_quality: string | null
          era: string | null
          event_date: string | null
          event_date_type: string | null
          event_id: string
          event_type: string | null
          fifo_level: string | null
          game: string
          internal_sku: string | null
          lot_id: string | null
          qty: number | null
          sale_price: number | null
          sale_type: string | null
          source_system: string | null
          unit_cost: number | null
        }
        Insert: {
          cardmarket_id?: string | null
          cogs_quality?: string | null
          data_quality?: string | null
          era?: string | null
          event_date?: string | null
          event_date_type?: string | null
          event_id: string
          event_type?: string | null
          fifo_level?: string | null
          game?: string
          internal_sku?: string | null
          lot_id?: string | null
          qty?: number | null
          sale_price?: number | null
          sale_type?: string | null
          source_system?: string | null
          unit_cost?: number | null
        }
        Update: {
          cardmarket_id?: string | null
          cogs_quality?: string | null
          data_quality?: string | null
          era?: string | null
          event_date?: string | null
          event_date_type?: string | null
          event_id?: string
          event_type?: string | null
          fifo_level?: string | null
          game?: string
          internal_sku?: string | null
          lot_id?: string | null
          qty?: number | null
          sale_price?: number | null
          sale_type?: string | null
          source_system?: string | null
          unit_cost?: number | null
        }
        Relationships: []
      }
      inventory_current: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          comment: string | null
          condition: string | null
          game: string
          internal_sku: string | null
          is_first_ed: boolean | null
          is_playset: boolean | null
          is_reverse: boolean | null
          is_signed: boolean | null
          lang: string | null
          last_updated: string | null
          listed_price_eur: number | null
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          qty: number | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
          snapshot_date: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          game?: string
          internal_sku?: string | null
          is_first_ed?: boolean | null
          is_playset?: boolean | null
          is_reverse?: boolean | null
          is_signed?: boolean | null
          lang?: string | null
          last_updated?: string | null
          listed_price_eur?: number | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          snapshot_date?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          game?: string
          internal_sku?: string | null
          is_first_ed?: boolean | null
          is_playset?: boolean | null
          is_reverse?: boolean | null
          is_signed?: boolean | null
          lang?: string | null
          last_updated?: string | null
          listed_price_eur?: number | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      inventory_daily_snapshot: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          condition: string | null
          inserted_at: string | null
          internal_sku: string
          is_reverse: boolean | null
          lang: string | null
          listed_price_eur: number | null
          name_es: string | null
          qty: number | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
          snapshot_date: string
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          condition?: string | null
          inserted_at?: string | null
          internal_sku: string
          is_reverse?: boolean | null
          lang?: string | null
          listed_price_eur?: number | null
          name_es?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          snapshot_date: string
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          condition?: string | null
          inserted_at?: string | null
          internal_sku?: string
          is_reverse?: boolean | null
          lang?: string | null
          listed_price_eur?: number | null
          name_es?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          snapshot_date?: string
        }
        Relationships: []
      }
      manual_inventory: {
        Row: {
          card_name: string | null
          cardmarket_id: string
          cn: string | null
          condition: string | null
          created_at: string | null
          internal_sku: string
          is_reverse: boolean | null
          lang: string | null
          last_updated: string | null
          listed_price_eur: number | null
          note: string | null
          qty: number
          rarity: string | null
          set_code: string | null
          set_name: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id: string
          cn?: string | null
          condition?: string | null
          created_at?: string | null
          internal_sku: string
          is_reverse?: boolean | null
          lang?: string | null
          last_updated?: string | null
          listed_price_eur?: number | null
          note?: string | null
          qty?: number
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string
          cn?: string | null
          condition?: string | null
          created_at?: string | null
          internal_sku?: string
          is_reverse?: boolean | null
          lang?: string | null
          last_updated?: string | null
          listed_price_eur?: number | null
          note?: string | null
          qty?: number
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
        }
        Relationships: []
      }
      missing_list: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          game: string
          internal_sku: string | null
          missing_tier: string | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          game?: string
          internal_sku?: string | null
          missing_tier?: string | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          game?: string
          internal_sku?: string | null
          missing_tier?: string | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
        }
        Relationships: []
      }
      orders_cm: {
        Row: {
          article_count: number | null
          buyer_country: string | null
          commission_eur: number | null
          era: string | null
          game: string
          ingest_batch_id: string | null
          merch_value_eur: number | null
          order_date: string | null
          order_id: string | null
          shipment_costs_eur: number | null
          source_file: string | null
          total_value_eur: number | null
        }
        Insert: {
          article_count?: number | null
          buyer_country?: string | null
          commission_eur?: number | null
          era?: string | null
          game?: string
          ingest_batch_id?: string | null
          merch_value_eur?: number | null
          order_date?: string | null
          order_id?: string | null
          shipment_costs_eur?: number | null
          source_file?: string | null
          total_value_eur?: number | null
        }
        Update: {
          article_count?: number | null
          buyer_country?: string | null
          commission_eur?: number | null
          era?: string | null
          game?: string
          ingest_batch_id?: string | null
          merch_value_eur?: number | null
          order_date?: string | null
          order_id?: string | null
          shipment_costs_eur?: number | null
          source_file?: string | null
          total_value_eur?: number | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      purchases_cm: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          comment: string | null
          condition: string | null
          data_quality: string | null
          game: string
          ingest_batch_id: string | null
          internal_sku: string | null
          is_reverse: boolean | null
          lang_code: string | null
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          purchased_at: string | null
          qty: number | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
          shipment_id: string | null
          source_file: string | null
          source_system: string | null
          unit_cost: number | null
          variant_resolution: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          data_quality?: string | null
          game?: string
          ingest_batch_id?: string | null
          internal_sku?: string | null
          is_reverse?: boolean | null
          lang_code?: string | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          purchased_at?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          shipment_id?: string | null
          source_file?: string | null
          source_system?: string | null
          unit_cost?: number | null
          variant_resolution?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          data_quality?: string | null
          game?: string
          ingest_batch_id?: string | null
          internal_sku?: string | null
          is_reverse?: boolean | null
          lang_code?: string | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          purchased_at?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          shipment_id?: string | null
          source_file?: string | null
          source_system?: string | null
          unit_cost?: number | null
          variant_resolution?: string | null
        }
        Relationships: []
      }
      purchases_physical: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          comment: string | null
          condition: string | null
          data_quality: string | null
          era: string | null
          game: string
          ingest_batch_id: string | null
          internal_sku: string | null
          is_first_ed: boolean | null
          is_playset: boolean | null
          is_reverse: boolean | null
          is_signed: boolean | null
          lang_code: string | null
          listed_at: string | null
          listed_price_eur: number | null
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          purchase_channel: string | null
          purchased_at: string | null
          qty: number | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
          source_file: string | null
          source_system: string | null
          unit_cost_eur: number | null
          variant_resolution: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          data_quality?: string | null
          era?: string | null
          game?: string
          ingest_batch_id?: string | null
          internal_sku?: string | null
          is_first_ed?: boolean | null
          is_playset?: boolean | null
          is_reverse?: boolean | null
          is_signed?: boolean | null
          lang_code?: string | null
          listed_at?: string | null
          listed_price_eur?: number | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          purchase_channel?: string | null
          purchased_at?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          source_file?: string | null
          source_system?: string | null
          unit_cost_eur?: number | null
          variant_resolution?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          data_quality?: string | null
          era?: string | null
          game?: string
          ingest_batch_id?: string | null
          internal_sku?: string | null
          is_first_ed?: boolean | null
          is_playset?: boolean | null
          is_reverse?: boolean | null
          is_signed?: boolean | null
          lang_code?: string | null
          listed_at?: string | null
          listed_price_eur?: number | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          purchase_channel?: string | null
          purchased_at?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          source_file?: string | null
          source_system?: string | null
          unit_cost_eur?: number | null
          variant_resolution?: string | null
        }
        Relationships: []
      }
      ref_cards: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          game: string
          is_promo: boolean | null
          is_reverse: boolean | null
          lang: string | null
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          rarity: string | null
          rarity_quality: string | null
          rarity_rule_applied: string | null
          set_code: string | null
          set_name: string | null
          source: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          game?: string
          is_promo?: boolean | null
          is_reverse?: boolean | null
          lang?: string | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          rarity?: string | null
          rarity_quality?: string | null
          rarity_rule_applied?: string | null
          set_code?: string | null
          set_name?: string | null
          source?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          game?: string
          is_promo?: boolean | null
          is_reverse?: boolean | null
          lang?: string | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          rarity?: string | null
          rarity_quality?: string | null
          rarity_rule_applied?: string | null
          set_code?: string | null
          set_name?: string | null
          source?: string | null
        }
        Relationships: []
      }
      release_dates: {
        Row: {
          created_at: string | null
          region_release: string
          release_date: string
          set_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          region_release: string
          release_date: string
          set_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          region_release?: string
          release_date?: string
          set_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role: Database["public"]["Enums"]["user_role_enum"]
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role: Database["public"]["Enums"]["user_role_enum"]
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_cm: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          data_quality: string | null
          era: string | null
          game: string
          ingest_batch_id: string | null
          internal_sku: string | null
          order_date: string | null
          qty: number | null
          sale_price: number | null
          set_name: string | null
          shipment_id: string | null
          source_file: string | null
          source_system: string | null
          variant_resolution: string | null
        }
        Insert: {
          card_name?: string | null
          cardmarket_id?: string | null
          data_quality?: string | null
          era?: string | null
          game?: string
          ingest_batch_id?: string | null
          internal_sku?: string | null
          order_date?: string | null
          qty?: number | null
          sale_price?: number | null
          set_name?: string | null
          shipment_id?: string | null
          source_file?: string | null
          source_system?: string | null
          variant_resolution?: string | null
        }
        Update: {
          card_name?: string | null
          cardmarket_id?: string | null
          data_quality?: string | null
          era?: string | null
          game?: string
          ingest_batch_id?: string | null
          internal_sku?: string | null
          order_date?: string | null
          qty?: number | null
          sale_price?: number | null
          set_name?: string | null
          shipment_id?: string | null
          source_file?: string | null
          source_system?: string | null
          variant_resolution?: string | null
        }
        Relationships: []
      }
      sales_physical: {
        Row: {
          cardmarket_id: string | null
          cardmarket_id_clean: string | null
          data_quality: string | null
          era: string | null
          game: string
          id_type: string | null
          ingest_batch_id: string | null
          internal_sku: string | null
          qty: number | null
          sale_channel: string | null
          sale_date: string | null
          sale_price: number | null
          sale_type: string | null
          source_file: string | null
          source_system: string | null
          trade_amount: number | null
          variant_resolution: string | null
        }
        Insert: {
          cardmarket_id?: string | null
          cardmarket_id_clean?: string | null
          data_quality?: string | null
          era?: string | null
          game?: string
          id_type?: string | null
          ingest_batch_id?: string | null
          internal_sku?: string | null
          qty?: number | null
          sale_channel?: string | null
          sale_date?: string | null
          sale_price?: number | null
          sale_type?: string | null
          source_file?: string | null
          source_system?: string | null
          trade_amount?: number | null
          variant_resolution?: string | null
        }
        Update: {
          cardmarket_id?: string | null
          cardmarket_id_clean?: string | null
          data_quality?: string | null
          era?: string | null
          game?: string
          id_type?: string | null
          ingest_batch_id?: string | null
          internal_sku?: string | null
          qty?: number | null
          sale_channel?: string | null
          sale_date?: string | null
          sale_price?: number | null
          sale_type?: string | null
          source_file?: string | null
          source_system?: string | null
          trade_amount?: number | null
          variant_resolution?: string | null
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          business_rarity: string | null
          channel: string | null
          discount_eur: number | null
          display_name: string | null
          game: string
          gross_amount: number | null
          internal_sku: string | null
          language: string | null
          money_direction: string | null
          payment_method: string | null
          qty: number | null
          sale_event_id: string
          sale_ts: string | null
          sale_type: string | null
          session_id: string | null
          source_system: string | null
          status: string | null
          trade_amount: number | null
          unit_price: number | null
        }
        Insert: {
          business_rarity?: string | null
          channel?: string | null
          discount_eur?: number | null
          display_name?: string | null
          game: string
          gross_amount?: number | null
          internal_sku?: string | null
          language?: string | null
          money_direction?: string | null
          payment_method?: string | null
          qty?: number | null
          sale_event_id: string
          sale_ts?: string | null
          sale_type?: string | null
          session_id?: string | null
          source_system?: string | null
          status?: string | null
          trade_amount?: number | null
          unit_price?: number | null
        }
        Update: {
          business_rarity?: string | null
          channel?: string | null
          discount_eur?: number | null
          display_name?: string | null
          game?: string
          gross_amount?: number | null
          internal_sku?: string | null
          language?: string | null
          money_direction?: string | null
          payment_method?: string | null
          qty?: number | null
          sale_event_id?: string
          sale_ts?: string | null
          sale_type?: string | null
          session_id?: string | null
          source_system?: string | null
          status?: string | null
          trade_amount?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      scan_events_test: {
        Row: {
          business_rarity: string | null
          channel: string | null
          created_at: string | null
          discount_eur: number | null
          display_name: string | null
          game: string
          gross_amount: number | null
          internal_sku: string | null
          language: string | null
          money_direction: string | null
          payment_method: string | null
          qty: number | null
          sale_event_id: string
          sale_ts: string | null
          sale_type: string | null
          session_id: string | null
          source_system: string | null
          status: string | null
          trade_amount: number | null
          unit_price: number | null
        }
        Insert: {
          business_rarity?: string | null
          channel?: string | null
          created_at?: string | null
          discount_eur?: number | null
          display_name?: string | null
          game: string
          gross_amount?: number | null
          internal_sku?: string | null
          language?: string | null
          money_direction?: string | null
          payment_method?: string | null
          qty?: number | null
          sale_event_id: string
          sale_ts?: string | null
          sale_type?: string | null
          session_id?: string | null
          source_system?: string | null
          status?: string | null
          trade_amount?: number | null
          unit_price?: number | null
        }
        Update: {
          business_rarity?: string | null
          channel?: string | null
          created_at?: string | null
          discount_eur?: string | null
          display_name?: string | null
          game?: string
          gross_amount?: number | null
          internal_sku?: string | null
          language?: string | null
          money_direction?: string | null
          payment_method?: string | null
          qty?: number | null
          sale_event_id?: string
          sale_ts?: string | null
          sale_type?: string | null
          session_id?: string | null
          source_system?: string | null
          status?: string | null
          trade_amount?: number | null
          unit_price?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          created_at_utc: string | null
          created_by: string | null
          email: string | null
          id: string
          last_login: string | null
          password_hash: string
          role: Database["public"]["Enums"]["user_role_enum"]
          status: string
          username: string
        }
        Insert: {
          created_at?: string | null
          created_at_utc?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: string
          username: string
        }
        Update: {
          created_at?: string | null
          created_at_utc?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          last_login?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role_enum"]
          status?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_available: {
        Row: {
          available_qty: number | null
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          comment: string | null
          condition: string | null
          game: string | null
          internal_sku: string | null
          is_first_ed: boolean | null
          is_playset: boolean | null
          is_reverse: boolean | null
          is_signed: boolean | null
          lang: string | null
          last_updated: string | null
          listed_price_eur: number | null
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          qty: number | null
          rarity: string | null
          set_code: string | null
          set_name: string | null
          snapshot_date: string | null
        }
        Insert: {
          available_qty?: never
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          game?: string | null
          internal_sku?: string | null
          is_first_ed?: boolean | null
          is_playset?: boolean | null
          is_reverse?: boolean | null
          is_signed?: boolean | null
          lang?: string | null
          last_updated?: string | null
          listed_price_eur?: number | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          snapshot_date?: string | null
        }
        Update: {
          available_qty?: never
          card_name?: string | null
          cardmarket_id?: string | null
          cn?: string | null
          comment?: string | null
          condition?: string | null
          game?: string | null
          internal_sku?: string | null
          is_first_ed?: boolean | null
          is_playset?: boolean | null
          is_reverse?: boolean | null
          is_signed?: boolean | null
          lang?: string | null
          last_updated?: string | null
          listed_price_eur?: number | null
          name_de?: string | null
          name_es?: string | null
          name_fr?: string | null
          name_it?: string | null
          qty?: number | null
          rarity?: string | null
          set_code?: string | null
          set_name?: string | null
          snapshot_date?: string | null
        }
        Relationships: []
      }
      mv_cm_orders: {
        Row: {
          article_count: number | null
          buyer_country: string | null
          commission_eur: number | null
          era: string | null
          merch_value_eur: number | null
          order_date: string | null
          order_id: string | null
          order_month: string | null
          shipment_costs_eur: number | null
          total_value_eur: number | null
        }
        Relationships: []
      }
      mv_inventory_snapshot: {
        Row: {
          aging_bucket: string | null
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          condition: string | null
          days_in_stock: number | null
          first_seen_date: string | null
          internal_sku: string | null
          inventory_value: number | null
          is_reverse: boolean | null
          lang: string | null
          last_updated: string | null
          listed_price_eur: number | null
          name_de: string | null
          name_es: string | null
          name_fr: string | null
          name_it: string | null
          qty: number | null
          rarity: string | null
          rarity_valid: boolean | null
          set_code: string | null
          set_name: string | null
          snapshot_date: string | null
          source: string | null
        }
        Relationships: []
      }
      mv_purchases_enriched: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          data_quality: string | null
          internal_sku: string | null
          is_reverse: boolean | null
          lang: string | null
          purchase_channel: string | null
          purchase_month: string | null
          purchased_at: string | null
          qty: number | null
          rarity: string | null
          rarity_valid: boolean | null
          set_code: string | null
          set_name: string | null
          source_system: string | null
          total_cost_eur: number | null
          unit_cost: number | null
        }
        Relationships: []
      }
      mv_sales_enriched: {
        Row: {
          card_name: string | null
          cardmarket_id: string | null
          cn: string | null
          cogs_quality: string | null
          cogs_total: number | null
          data_quality: string | null
          era: string | null
          fifo_level: string | null
          gross_margin_eur: number | null
          gross_margin_pct: number | null
          has_fifo_cogs: boolean | null
          internal_sku: string | null
          is_reverse: boolean | null
          lang: string | null
          listed_price_eur: number | null
          qty: number | null
          rarity: string | null
          rarity_valid: boolean | null
          revenue_eur: number | null
          sale_channel: string | null
          sale_date: string | null
          sale_month: string | null
          sale_price: number | null
          sale_type: string | null
          set_code: string | null
          set_name: string | null
          source_system: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_expired_locks: { Args: never; Returns: undefined }
      confirm_cart_and_update_inventory: {
        Args: { p_session_id: string }
        Returns: Json
      }
      insert_inventory_daily_snapshot: { Args: never; Returns: number }
      refresh_all_mvs: { Args: never; Returns: undefined }
      verify_password_bcrypt: {
        Args: { hash: string; plain_password: string }
        Returns: boolean
      }
    }
    Enums: {
      permission_check_enum: "ALLOWED" | "DENIED"
      user_role_enum: "Admin" | "Member" | "User"
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
      permission_check_enum: ["ALLOWED", "DENIED"],
      user_role_enum: ["Admin", "Member", "User"],
    },
  },
} as const
