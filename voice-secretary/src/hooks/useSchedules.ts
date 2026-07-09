import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { notifyScheduleShareReceived } from '../services/pushNotification';
import { fetchSharesForUser, linkScheduleSharesForCurrentUser } from '../services/scheduleShare';
import { supabase } from '../services/supabase';
import { parseScheduleRow, type Schedule, type ScheduleShareInfo } from '../types/schedule';

function enrichSchedules(
  rows: Schedule[],
  userId: string,
  ownedShares: { schedule_id: string; shared_with_email: string }[],
  ownerEmails: Map<string, string | null>,
): Schedule[] {
  const sharedByMeMap = new Map<string, string[]>();
  for (const share of ownedShares) {
    const list = sharedByMeMap.get(share.schedule_id) ?? [];
    list.push(share.shared_with_email);
    sharedByMeMap.set(share.schedule_id, list);
  }

  return rows.map((schedule) => {
    const isOwned = schedule.user_id === userId;
    const sharedWithEmails = sharedByMeMap.get(schedule.id) ?? [];
    const shareInfo: ScheduleShareInfo = {
      isOwned,
      isSharedWithMe: !isOwned,
      isSharedByMe: isOwned && sharedWithEmails.length > 0,
      ownerEmail: isOwned ? null : (ownerEmails.get(schedule.user_id) ?? null),
      sharedWithEmails,
    };
    return { ...schedule, shareInfo };
  });
}

export function useSchedules(userId: string | undefined, userEmail: string | undefined) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedules = useCallback(async () => {
    if (!userId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    await linkScheduleSharesForCurrentUser();

    const { data, error: fetchError } = await supabase
      .from('schedules')
      .select('*')
      .neq('status', 'cancelled')
      .order('target_timestamp', { ascending: false, nullsFirst: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    try {
      const parsed = (data ?? []).map(parseScheduleRow);
      const { ownedShares } = await fetchSharesForUser(userId, userEmail);

      const foreignOwnerIds = [
        ...new Set(parsed.filter((s) => s.user_id !== userId).map((s) => s.user_id)),
      ];
      const ownerEmails = new Map<string, string | null>();
      if (foreignOwnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', foreignOwnerIds);
        for (const profile of profiles ?? []) {
          ownerEmails.set(profile.id, profile.email);
        }
      }

      setSchedules(enrichSchedules(parsed, userId, ownedShares, ownerEmails));
    } catch (err) {
      setError((err as Error).message);
      setSchedules((data ?? []).map(parseScheduleRow));
    }

    setLoading(false);
  }, [userId, userEmail]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchSchedules();
    });
    return () => sub.remove();
  }, [fetchSchedules]);

  useEffect(() => {
    if (!userId) return;

    const handleIncomingShare = async (row: {
      owner_id: string;
      schedule_id: string;
      shared_with_email: string;
      shared_with_user_id: string | null;
    }) => {
      const isForMe =
        row.shared_with_user_id === userId ||
        (!!userEmail && row.shared_with_email.toLowerCase() === userEmail.toLowerCase());

      if (!isForMe || row.owner_id === userId) return;

      const [{ data: scheduleRow }, { data: ownerProfile }] = await Promise.all([
        supabase.from('schedules').select('parsed_content').eq('id', row.schedule_id).maybeSingle(),
        supabase.from('profiles').select('email').eq('id', row.owner_id).maybeSingle(),
      ]);

      const parsed = scheduleRow?.parsed_content as { title?: string } | null | undefined;
      const title = parsed?.title?.trim() || '일정';
      const fromEmail = ownerProfile?.email ?? row.shared_with_email;

      await notifyScheduleShareReceived({
        title,
        fromEmail,
        scheduleId: row.schedule_id,
      });
    };

    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchSchedules();
        },
      )
      .subscribe();

    const shareChannel = supabase
      .channel('schedule-shares-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'schedule_shares' },
        (payload) => {
          const row = payload.new as {
            owner_id: string;
            schedule_id: string;
            shared_with_email: string;
            shared_with_user_id: string | null;
          };
          void handleIncomingShare(row);
          fetchSchedules();
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'schedule_shares' },
        () => {
          fetchSchedules();
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'schedule_shares' },
        () => {
          fetchSchedules();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(shareChannel);
    };
  }, [userId, userEmail, fetchSchedules]);

  const updateSchedule = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      const { error: updateError } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      await fetchSchedules();
    },
    [fetchSchedules],
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from('schedules')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (deleteError) throw deleteError;
      await fetchSchedules();
    },
    [fetchSchedules],
  );

  return {
    schedules,
    loading,
    error,
    refresh: fetchSchedules,
    updateSchedule,
    deleteSchedule,
  };
}

export async function fetchScheduleById(id: string): Promise<Schedule | null> {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return parseScheduleRow(data);
}
