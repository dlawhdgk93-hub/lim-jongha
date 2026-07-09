import { supabase } from './supabase';

export type ScheduleShareRow = {
  id: string;
  schedule_id: string;
  owner_id: string;
  shared_with_email: string;
  shared_with_user_id: string | null;
  permission: 'view' | 'edit';
  created_at: string;
};

export async function fetchSharesForUser(userId: string, userEmail: string | undefined) {
  const { data: ownedShares, error: ownedError } = await supabase
    .from('schedule_shares')
    .select('*')
    .eq('owner_id', userId);

  if (ownedError) throw ownedError;

  let receivedShares: ScheduleShareRow[] = [];
  if (userEmail) {
    const { data, error } = await supabase
      .from('schedule_shares')
      .select('*')
      .or(`shared_with_user_id.eq.${userId},shared_with_email.eq.${userEmail.toLowerCase()}`);
    if (error) throw error;
    receivedShares = (data ?? []) as ScheduleShareRow[];
  } else {
    const { data, error } = await supabase
      .from('schedule_shares')
      .select('*')
      .eq('shared_with_user_id', userId);
    if (error) throw error;
    receivedShares = (data ?? []) as ScheduleShareRow[];
  }

  return {
    ownedShares: (ownedShares ?? []) as ScheduleShareRow[],
    receivedShares,
  };
}

export async function shareScheduleWithEmail(
  scheduleId: string,
  ownerId: string,
  email: string,
  permission: 'view' | 'edit' = 'view',
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes('@')) {
    throw new Error('올바른 이메일 주소를 입력해 주세요.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  const { data, error } = await supabase
    .from('schedule_shares')
    .upsert(
      {
        schedule_id: scheduleId,
        owner_id: ownerId,
        shared_with_email: normalizedEmail,
        shared_with_user_id: profile?.id ?? null,
        permission,
      },
      { onConflict: 'schedule_id,shared_with_email' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as ScheduleShareRow;
}

export async function removeScheduleShare(shareId: string) {
  const { error } = await supabase.from('schedule_shares').delete().eq('id', shareId);
  if (error) throw error;
}

export async function fetchSharesForSchedule(scheduleId: string) {
  const { data, error } = await supabase
    .from('schedule_shares')
    .select('*')
    .eq('schedule_id', scheduleId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ScheduleShareRow[];
}

/** 로그인 시 이메일로 공유받은 일정을 내 계정에 연결 */
export async function linkScheduleSharesForCurrentUser(): Promise<number> {
  const { data, error } = await supabase.rpc('link_schedule_shares_for_user');
  if (error) {
    console.warn('link schedule shares:', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}
