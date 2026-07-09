import { appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOG = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'debug-902235.log');
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function log(hypothesisId, location, message, data, runId = 'post-fix-sim') {
  appendFileSync(
    LOG,
    `${JSON.stringify({
      sessionId: '902235',
      hypothesisId,
      location,
      message,
      data,
      runId,
      timestamp: Date.now(),
    })}\n`,
  );
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatKstDate(date) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}`;
}

function formatKstWallTime(hour, minute) {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function shiftKstDateKey(dateKey, dayDelta) {
  const anchor = new Date(`${dateKey}T12:00:00+09:00`);
  anchor.setUTCDate(anchor.getUTCDate() + dayDelta);
  return formatKstDate(anchor);
}

function kstInstantMs(dateKey, hour, minute) {
  return new Date(`${dateKey}T${pad2(hour)}:${pad2(minute)}:00+09:00`).getTime();
}

function resolveAmbiguousHour(hour12, minute, dateKey, now, text) {
  const h = Math.max(1, Math.min(12, hour12));
  const amHour = h === 12 ? 0 : h;
  const pmHour = h === 12 ? 12 : h + 12;
  const nowMs = now.getTime();
  const tomorrow = shiftKstDateKey(dateKey, 1);
  const candidates = [
    { dateKey, hour: amHour, minute, ms: kstInstantMs(dateKey, amHour, minute) },
    { dateKey, hour: pmHour, minute, ms: kstInstantMs(dateKey, pmHour, minute) },
    { dateKey: tomorrow, hour: amHour, minute, ms: kstInstantMs(tomorrow, amHour, minute) },
    { dateKey: tomorrow, hour: pmHour, minute, ms: kstInstantMs(tomorrow, pmHour, minute) },
  ];
  const upcoming = candidates.filter((c) => c.ms >= nowMs - 60_000);
  upcoming.sort((a, b) => a.ms - b.ms);
  return upcoming[0] ?? candidates.sort((a, b) => a.ms - b.ms)[0];
}

function stripScheduleTokens(normalized) {
  return normalized
    .replace(/(오전|오후)?\s*\d{1,2}\s*시(\s*\d{1,2}\s*분)?\s*에/g, ' ')
    .replace(/(오전|오후)?\s*\d{1,2}\s*시(\s*\d{1,2}\s*분)?/g, ' ')
    .replace(/^\s*에\s+/g, '')
    .replace(/\s+에\s+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fixedEdgeParse(text, defaultDateKey, now) {
  const normalized = text.trim();
  const dateKey = defaultDateKey || formatKstDate(now);
  const timeMatch = normalized.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  const hour12 = parseInt(timeMatch[2], 10);
  const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
  const picked = resolveAmbiguousHour(hour12, minute, dateKey, now, normalized);
  return {
    title: stripScheduleTokens(normalized),
    date: picked.dateKey,
    time: formatKstWallTime(picked.hour, picked.minute),
  };
}

const text = '6시 5분에 도착예정';
const defaultDateKey = '2026-07-09';
const nowUtc = new Date('2026-07-08T20:26:00.000Z');

const result = fixedEdgeParse(text, defaultDateKey, nowUtc);
log('H1', 'repro:postFixUtc', 'fixed edge parse on UTC server', result, 'post-fix-sim');
console.log(JSON.stringify(result, null, 2));
