// Supabase schema types.
//
// Hand-maintained to mirror `supabase gen types typescript --local` output for the
// public schema. Regenerate after migrations with `pnpm db:types` (requires the local
// stack running) to keep this in sync with the database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          price: number
          stock: number
          category: string | null
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          stock?: number
          category?: string | null
          unit?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          stock?: number
          category?: string | null
          unit?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          payment_method: string
          total: number
          amount_paid: number | null
          change_amount: number | null
          note: string | null
          user_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payment_method: string
          total: number
          amount_paid?: number | null
          change_amount?: number | null
          note?: string | null
          user_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payment_method?: string
          total?: number
          amount_paid?: number | null
          change_amount?: number | null
          note?: string | null
          user_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          product_id: string | null
          product_name: string
          product_price: number
          quantity: number
          subtotal: number
        }
        Insert: {
          id?: string
          transaction_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          quantity: number
          subtotal: number
        }
        Update: {
          id?: string
          transaction_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: 'transaction_items_transaction_id_fkey'
            columns: ['transaction_id']
            isOneToOne: false
            referencedRelation: 'transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'transaction_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      create_transaction: {
        Args: {
          p_payment_method: string
          p_items: Json
          p_amount_paid?: number | null
        }
        Returns: Json
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
