export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: Database["public"]["Enums"]["activity_action"];
          actor_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          payload: Json;
          space_id: string;
        };
        Insert: {
          action: Database["public"]["Enums"]["activity_action"];
          actor_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          payload?: Json;
          space_id: string;
        };
        Update: {
          action?: Database["public"]["Enums"]["activity_action"];
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          payload?: Json;
          space_id?: string;
        };
        Relationships: [];
      };
      checklist_items: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          is_done: boolean;
          position: number;
          task_id: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          is_done?: boolean;
          position?: number;
          task_id: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          is_done?: boolean;
          position?: number;
          task_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          author_id: string;
          body: string;
          created_at: string;
          id: string;
          task_id: string;
        };
        Insert: {
          author_id: string;
          body: string;
          created_at?: string;
          id?: string;
          task_id: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          created_at?: string;
          id?: string;
          task_id?: string;
        };
        Relationships: [];
      };
      library_items: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          owner_id: string;
          title: string;
          updated_at: string;
          url: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          owner_id: string;
          title: string;
          updated_at?: string;
          url?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          owner_id?: string;
          title?: string;
          updated_at?: string;
          url?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          created_at: string;
          created_by: string;
          description: string | null;
          id: string;
          name: string;
          space_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description?: string | null;
          id?: string;
          name: string;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string | null;
          id?: string;
          name?: string;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      space_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["space_role"];
          space_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["space_role"];
          space_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["space_role"];
          space_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          created_at: string;
          id: string;
          kind: Database["public"]["Enums"]["space_kind"];
          name: string;
          owner_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["space_kind"];
          name: string;
          owner_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          kind?: Database["public"]["Enums"]["space_kind"];
          name?: string;
          owner_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      statuses: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          position: number;
          space_id: string;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          position?: number;
          space_id: string;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          position?: number;
          space_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: {
          created_at: string;
          task_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          task_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      task_links: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          task_id: string;
          title: string | null;
          url: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position?: number;
          task_id: string;
          title?: string | null;
          url: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          task_id?: string;
          title?: string | null;
          url?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          due_date: string | null;
          due_time: string | null;
          estimate_minutes: number | null;
          id: string;
          priority: Database["public"]["Enums"]["task_priority"];
          project_id: string | null;
          source: Database["public"]["Enums"]["task_source"];
          space_id: string;
          status_id: string | null;
          title: string;
          type: Database["public"]["Enums"]["task_type"];
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          estimate_minutes?: number | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string | null;
          source?: Database["public"]["Enums"]["task_source"];
          space_id: string;
          status_id?: string | null;
          title: string;
          type?: Database["public"]["Enums"]["task_type"];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          due_time?: string | null;
          estimate_minutes?: number | null;
          id?: string;
          priority?: Database["public"]["Enums"]["task_priority"];
          project_id?: string | null;
          source?: Database["public"]["Enums"]["task_source"];
          space_id?: string;
          status_id?: string | null;
          title?: string;
          type?: Database["public"]["Enums"]["task_type"];
          updated_at?: string;
        };
        Relationships: [];
      };
      time_entries: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          minutes: number;
          source: Database["public"]["Enums"]["time_entry_source"];
          started_at: string;
          task_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          minutes?: number;
          source?: Database["public"]["Enums"]["time_entry_source"];
          started_at?: string;
          task_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          minutes?: number;
          source?: Database["public"]["Enums"]["time_entry_source"];
          started_at?: string;
          task_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      activity_action:
        | "created"
        | "updated"
        | "completed"
        | "uncompleted"
        | "rescheduled"
        | "status_changed"
        | "priority_changed"
        | "assigned"
        | "commented"
        | "timer_started"
        | "timer_stopped"
        | "duplicated"
        | "trashed"
        | "restored";
      space_kind: "personal" | "team";
      space_role: "owner" | "member";
      task_priority: "none" | "low" | "medium" | "high";
      task_source: "manual" | "inbox";
      task_type: "task" | "call" | "meeting";
      time_entry_source: "timer" | "manual";
    };
    CompositeTypes: Record<string, never>;
  };
};
