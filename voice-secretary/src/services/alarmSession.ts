let activeScheduleId: string | null = null;

/** Returns false if this schedule already has an active alarm session. */
export function beginAlarmSession(scheduleId: string): boolean {
  if (activeScheduleId === scheduleId) return false;
  activeScheduleId = scheduleId;
  return true;
}

export function endAlarmSession(scheduleId?: string) {
  if (!scheduleId || activeScheduleId === scheduleId) {
    activeScheduleId = null;
  }
}

export function getActiveAlarmScheduleId(): string | null {
  return activeScheduleId;
}
