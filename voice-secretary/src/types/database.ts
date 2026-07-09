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
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          expo_push_token: string | null;
          id: string;
          notification_lead_minutes: number;
          plan_type: string;
          timezone: string;
          updated_at: string;
        };
      };
      schedules: {
        Row: {
          confidence: number | null;
          contact_info: Json | null;
          created_at: string;
          id: string;
          location_info: Json | null;
          parsed_content: Json;
          raw_text: string | null;
          snooze_count: number;
          source: 'voice' | 'manual' | 'calendar_sync';
          status: 'pending' | 'completed' | 'snoozed' | 'cancelled';
          target_timestamp: string | null;
          updated_at: string;
          user_id: string;
        };
      };
      schedule_shares: {
        Row: {
          id: string;
          schedule_id: string;
          owner_id: string;
          shared_with_email: string;
          shared_with_user_id: string | null;
          permission: 'view' | 'edit';
          created_at: string;
        };
      };
      share_contacts: {
        Row: {
          id: string;
          owner_id: string;
          contact_email: string;
          contact_user_id: string | null;
          display_name: string | null;
          auto_share_today: boolean;
          auto_share_tomorrow: boolean;
          default_permission: 'view' | 'edit';
          created_at: string;
        };
      };
      share_groups: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
        };
      };
      share_group_members: {
        Row: {
          id: string;
          group_id: string;
          contact_id: string;
          created_at: string;
        };
      };
    };
  };
};
