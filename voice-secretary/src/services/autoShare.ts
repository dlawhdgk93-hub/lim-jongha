import { supabase } from './supabase';
import type { ShareContact } from './shareContacts';
import { fetchShareContacts, shareScheduleWithContact } from './shareContacts';
import { getScheduleDateKey, getTodayKey, getTomorrowKey } from '../utils/scheduleDates';

export async function applyAutoShareForSchedule(
  ownerId: string,
  scheduleId: string,
  targetTimestamp: string | null,
) {
  if (!targetTimestamp) return { sharedCount: 0 };

  const contacts = await fetchShareContacts(ownerId);
  const dateKey = getScheduleDateKey(targetTimestamp);
  const todayKey = getTodayKey();
  const tomorrowKey = getTomorrowKey();

  let sharedCount = 0;
  for (const contact of contacts) {
    const shareToday = contact.auto_share_today && dateKey === todayKey;
    const shareTomorrow = contact.auto_share_tomorrow && dateKey === tomorrowKey;
    if (!shareToday && !shareTomorrow) continue;

    await shareScheduleWithContact(
      scheduleId,
      ownerId,
      contact,
      contact.default_permission ?? 'view',
    );
    sharedCount += 1;
  }

  return { sharedCount };
}

export async function backfillAutoShareForContact(
  ownerId: string,
  contact: ShareContact,
): Promise<number> {
  const todayKey = getTodayKey();
  const tomorrowKey = getTomorrowKey();
  const dateKeys: string[] = [];
  if (contact.auto_share_today) dateKeys.push(todayKey);
  if (contact.auto_share_tomorrow) dateKeys.push(tomorrowKey);
  if (dateKeys.length === 0) return 0;

  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('id, target_timestamp')
    .eq('user_id', ownerId)
    .neq('status', 'cancelled');

  if (error) throw error;

  let count = 0;
  for (const schedule of schedules ?? []) {
    if (!schedule.target_timestamp) continue;
    const key = getScheduleDateKey(schedule.target_timestamp);
    if (!dateKeys.includes(key)) continue;
    await shareScheduleWithContact(
      schedule.id,
      ownerId,
      contact,
      contact.default_permission ?? 'view',
    );
    count += 1;
  }
  return count;
}
