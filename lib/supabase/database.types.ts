export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string | null;
          title: string;
          notes: string | null;
          status: "open" | "done" | "archived";
          energy: "low" | "medium" | "high";
          due_on: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          project_id?: string | null;
          title: string;
          notes?: string | null;
          status?: "open" | "done" | "archived";
          energy?: "low" | "medium" | "high";
          due_on?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          project_id?: string | null;
          title?: string;
          notes?: string | null;
          status?: "open" | "done" | "archived";
          energy?: "low" | "medium" | "high";
          due_on?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      library_items: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      task_status: "open" | "done" | "archived";
      task_energy: "low" | "medium" | "high";
    };
    CompositeTypes: Record<string, never>;
  };
};
