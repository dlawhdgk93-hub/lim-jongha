import type { Json } from '../types/database';

export type ScheduleStatus = 'pending' | 'completed' | 'snoozed' | 'cancelled';

export type ParsedContent = {
  title: string;
  date: string;
  time: string;
  notes?: string;
  alarm_mode?: 'sound' | 'vibrate' | 'both';
  /** 시간 없이 당일만 표시 — 알람 없음 */
  is_all_day?: boolean;
};

export type ContactInfo = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type LocationInfo = {
  address?: string;
  lat?: number;
  lng?: number;
  place_name?: string;
};

export type ScheduleShareInfo = {
  isOwned: boolean;
  isSharedWithMe: boolean;
  isSharedByMe: boolean;
  ownerEmail?: string | null;
  sharedWithEmails?: string[];
};

export type Schedule = {
  id: string;
  user_id: string;
  raw_text: string | null;
  parsed_content: ParsedContent;
  target_timestamp: string | null;
  location_info: LocationInfo | null;
  contact_info: ContactInfo | null;
  status: ScheduleStatus;
  snooze_count: number;
  confidence: number | null;
  created_at: string;
  updated_at: string;
  shareInfo?: ScheduleShareInfo;
};

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

function normalizeParsedContent(raw: Json): ParsedContent {
  let content: unknown = raw;
  if (typeof raw === 'string') {
    try {
      content = JSON.parse(raw);
    } catch {
      content = { title: raw };
    }
  }

  const record = (content ?? {}) as Record<string, unknown>;
  return {
    title: asString(record.title, '새 일정'),
    date: asString(record.date),
    time: asString(record.time),
    notes: record.notes ? asString(record.notes) : undefined,
    alarm_mode:
      record.alarm_mode === 'sound' ||
      record.alarm_mode === 'vibrate' ||
      record.alarm_mode === 'both'
        ? record.alarm_mode
        : undefined,
    is_all_day: record.is_all_day === true,
  };
}

export function parseScheduleRow(row: {
  id: string;
  user_id: string;
  raw_text: string | null;
  parsed_content: Json;
  target_timestamp: string | null;
  location_info: Json | null;
  contact_info: Json | null;
  status: ScheduleStatus;
  snooze_count: number;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}): Schedule {
  const content = normalizeParsedContent(row.parsed_content);
  return {
    ...row,
    parsed_content: content,
    location_info: (row.location_info as LocationInfo | null) ?? null,
    contact_info: (row.contact_info as ContactInfo | null) ?? null,
  };
}

export type VoiceParseResult = {
  schedule: {
    raw_text: string;
    parsed_content: ParsedContent;
    target_timestamp: string;
    location_info: LocationInfo | null;
    contact_info: ContactInfo | null;
  };
  confidence: number;
};
