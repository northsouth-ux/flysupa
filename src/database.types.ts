
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "invites": {
                  Row: {
                    "created_at": string | null,"created_by": string,"expires_at": string | null,"id": string,"role": Database["public"]['Enums']["school_role"],"school_id": string,"token": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"created_by": string,"expires_at"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["school_role"],"school_id": string,"token"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "created_at"?: string | null,"created_by"?: string,"expires_at"?: string | null,"id"?: string,"role"?: Database["public"]['Enums']["school_role"],"school_id"?: string,"token"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_item_associations": {
                  Row: {
                    "lesson_id": number,"lesson_item_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "lesson_id": number,"lesson_item_id": number
                  }
                  Update: {
                    "lesson_id"?: number,"lesson_item_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_item_associations_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_item_associations_lesson_item_id_fkey"
      columns: ["lesson_item_id"]
isOneToOne: false
      referencedRelation: "lessons_items"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons": {
                  Row: {
                    "amount_hours": number,"created_at": string | null,"date": string | null,"description": string | null,"id": number,"profile_id": string | null,"school_id": string | null,"time": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_hours"?: number,"created_at"?: string | null,"date"?: string | null,"description"?: string | null,"id"?: never,"profile_id"?: string | null,"school_id"?: string | null,"time"?: string | null,"title": string
                  }
                  Update: {
                    "amount_hours"?: number,"created_at"?: string | null,"date"?: string | null,"description"?: string | null,"id"?: never,"profile_id"?: string | null,"school_id"?: string | null,"time"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lessons_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"lessons_items": {
                  Row: {
                    "description": string | null,"id": number,"school_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: never,"school_id"?: string | null,"title": string
                  }
                  Update: {
                    "description"?: string | null,"id"?: never,"school_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lessons_items_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "address": string | null,"admin": boolean | null,"avatar_url": string | null,"cognome_utente": string | null,"date_of_birth": string | null,"email": string | null,"full_name": string | null,"id": string,"is_student": boolean,"license_url": string | null,"licenza_date": string | null,"nip": string | null,"nome_utente": string | null,"phone": string | null,"platform_admin": boolean | null,"school_id": string | null,"sensibilizzazione": boolean | null,"soccorritori": boolean | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"admin"?: boolean | null,"avatar_url"?: string | null,"cognome_utente"?: string | null,"date_of_birth"?: string | null,"email"?: string | null,"full_name"?: string | null,"id"?: string,"is_student"?: boolean,"license_url"?: string | null,"licenza_date"?: string | null,"nip"?: string | null,"nome_utente"?: string | null,"phone"?: string | null,"platform_admin"?: boolean | null,"school_id"?: string | null,"sensibilizzazione"?: boolean | null,"soccorritori"?: boolean | null,"updated_at"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"admin"?: boolean | null,"avatar_url"?: string | null,"cognome_utente"?: string | null,"date_of_birth"?: string | null,"email"?: string | null,"full_name"?: string | null,"id"?: string,"is_student"?: boolean,"license_url"?: string | null,"licenza_date"?: string | null,"nip"?: string | null,"nome_utente"?: string | null,"phone"?: string | null,"platform_admin"?: boolean | null,"school_id"?: string | null,"sensibilizzazione"?: boolean | null,"soccorritori"?: boolean | null,"updated_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"school_members": {
                  Row: {
                    "created_at": string | null,"id": number,"role": Database["public"]['Enums']["school_role"],"school_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: never,"role"?: Database["public"]['Enums']["school_role"],"school_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: never,"role"?: Database["public"]['Enums']["school_role"],"school_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "school_members_school_id_fkey"
      columns: ["school_id"]
isOneToOne: false
      referencedRelation: "schools"
      referencedColumns: ["id"]
    }
                  ]
                },"schools": {
                  Row: {
                    "created_at": string | null,"id": string,"name": string,"owner_id": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string | null,"id"?: string,"name": string,"owner_id": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string | null,"id"?: string,"name"?: string,"owner_id"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "lesson_item_details_view": {
                  Row: {
                    "description": string | null,"lesson_id": number,"lesson_item_id": number,"title": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "lesson_item_associations_lesson_id_fkey"
      columns: ["lesson_id"]
isOneToOne: false
      referencedRelation: "lessons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_item_associations_lesson_item_id_fkey"
      columns: ["lesson_item_id"]
isOneToOne: false
      referencedRelation: "lessons_items"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "create_school":
{ Args: { "school_name": string,"school_slug": string }; Returns: Json
                           },
"get_user_school_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_platform_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"join_school_via_invite":
{ Args: { "invite_token": string }; Returns: Json
                           },
"set_active_school":
{ Args: { "target_school_id": string }; Returns: boolean
                           },
"storage_is_school_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           }
          }
          Enums: {
            "school_role": "owner"|"admin"|"instructor"|"student"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "school_role": ["owner", "admin", "instructor", "student"]
          }
        }
} as const
