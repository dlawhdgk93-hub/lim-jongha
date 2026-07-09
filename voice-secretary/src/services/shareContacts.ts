import { supabase } from './supabase';

export type ShareContact = {
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

export type ShareContactSettings = {
  auto_share_today?: boolean;
  auto_share_tomorrow?: boolean;
  default_permission?: 'view' | 'edit';
};

export async function fetchShareContacts(userId: string): Promise<ShareContact[]> {
  const { data, error } = await supabase
    .from('share_contacts')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as ShareContact[];
}

export async function addShareContact(
  userId: string,
  email: string,
  displayName?: string,
): Promise<ShareContact> {
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
    .from('share_contacts')
    .upsert(
      {
        owner_id: userId,
        contact_email: normalizedEmail,
        contact_user_id: profile?.id ?? null,
        display_name: displayName?.trim() || null,
      },
      { onConflict: 'owner_id,contact_email' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as ShareContact;
}

export async function updateShareContactSettings(
  contactId: string,
  settings: ShareContactSettings,
): Promise<ShareContact> {
  const { data, error } = await supabase
    .from('share_contacts')
    .update(settings)
    .eq('id', contactId)
    .select('*')
    .single();

  if (error) throw error;
  return data as ShareContact;
}

export async function removeShareContact(contactId: string) {
  const { error } = await supabase.from('share_contacts').delete().eq('id', contactId);
  if (error) throw error;
}

export async function shareScheduleWithContact(
  scheduleId: string,
  ownerId: string,
  contact: ShareContact,
  permission: 'view' | 'edit' = 'view',
) {
  const { data, error } = await supabase
    .from('schedule_shares')
    .upsert(
      {
        schedule_id: scheduleId,
        owner_id: ownerId,
        shared_with_email: contact.contact_email,
        shared_with_user_id: contact.contact_user_id,
        permission,
      },
      { onConflict: 'schedule_id,shared_with_email' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export function getContactLabel(contact: ShareContact): string {
  return contact.display_name ?? contact.contact_email.split('@')[0];
}
