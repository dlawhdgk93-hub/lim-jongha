import { supabase } from './supabase';
import type { ShareContact } from './shareContacts';
import { shareScheduleWithContact } from './shareContacts';

export type ShareGroup = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
};

export type ShareGroupMember = {
  id: string;
  group_id: string;
  contact_id: string;
  created_at: string;
  contact?: ShareContact;
};

export type ShareGroupWithMembers = ShareGroup & {
  members: ShareGroupMember[];
};

export async function fetchShareGroups(userId: string): Promise<ShareGroupWithMembers[]> {
  const { data: groups, error } = await supabase
    .from('share_groups')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!groups?.length) return [];

  const groupIds = groups.map((g) => g.id);
  const { data: members, error: memberError } = await supabase
    .from('share_group_members')
    .select('*')
    .in('group_id', groupIds);

  if (memberError) throw memberError;

  const contactIds = [...new Set((members ?? []).map((m) => m.contact_id))];
  let contactMap = new Map<string, ShareContact>();
  if (contactIds.length > 0) {
    const { data: contacts } = await supabase
      .from('share_contacts')
      .select('*')
      .in('id', contactIds);
    contactMap = new Map((contacts ?? []).map((c) => [c.id, c as ShareContact]));
  }

  return (groups as ShareGroup[]).map((group) => ({
    ...group,
    members: ((members ?? []) as ShareGroupMember[])
      .filter((m) => m.group_id === group.id)
      .map((m) => ({ ...m, contact: contactMap.get(m.contact_id) })),
  }));
}

export async function createShareGroup(userId: string, name: string): Promise<ShareGroup> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('그룹 이름을 입력해 주세요.');

  const { data, error } = await supabase
    .from('share_groups')
    .insert({ owner_id: userId, name: trimmed })
    .select('*')
    .single();

  if (error) throw error;
  return data as ShareGroup;
}

export async function deleteShareGroup(groupId: string) {
  const { error } = await supabase.from('share_groups').delete().eq('id', groupId);
  if (error) throw error;
}

export async function addContactToGroup(groupId: string, contactId: string) {
  const { error } = await supabase
    .from('share_group_members')
    .upsert({ group_id: groupId, contact_id: contactId }, { onConflict: 'group_id,contact_id' });

  if (error) throw error;
}

export async function removeContactFromGroup(memberId: string) {
  const { error } = await supabase.from('share_group_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function shareScheduleWithGroup(
  scheduleId: string,
  ownerId: string,
  group: ShareGroupWithMembers,
  permission: 'view' | 'edit' = 'view',
) {
  let count = 0;
  for (const member of group.members) {
    const contact = member.contact;
    if (!contact) continue;
    await shareScheduleWithContact(scheduleId, ownerId, contact, permission);
    count += 1;
  }
  return count;
}
