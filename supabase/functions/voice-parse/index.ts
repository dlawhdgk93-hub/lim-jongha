import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ParsedContent = {
  title: string;
  date: string;
  time: string;
  notes?: string;
  is_all_day?: boolean;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatKstDate(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${pad2(kst.getUTCMonth() + 1)}-${pad2(kst.getUTCDate())}`;
}

function formatKstTime(date: Date): string {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return `${pad2(kst.getUTCHours())}:${pad2(kst.getUTCMinutes())}`;
}

function formatKstWallTime(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

function shiftKstDateKey(dateKey: string, dayDelta: number): string {
  const anchor = new Date(`${dateKey}T12:00:00+09:00`);
  anchor.setUTCDate(anchor.getUTCDate() + dayDelta);
  return formatKstDate(anchor);
}

function resolveKstDateKey(now: Date, normalized: string, defaultDateKey = ""): string {
  const today = formatKstDate(now);
  if (/모레/.test(normalized)) return shiftKstDateKey(today, 2);
  if (/내일/.test(normalized)) return shiftKstDateKey(today, 1);
  if (/오늘/.test(normalized)) return today;
  if (/어제/.test(normalized)) return shiftKstDateKey(today, -1);
  if (defaultDateKey && /^\d{4}-\d{2}-\d{2}$/.test(defaultDateKey)) return defaultDateKey;
  return today;
}

function inferYearForMonthDay(month: number, day: number, now: Date): number {
  const today = formatKstDate(now);
  const [year, todayMonth, todayDay] = today.split("-").map(Number);
  if (month < todayMonth || (month === todayMonth && day < todayDay)) return year + 1;
  return year;
}

function isValidDateKey(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(`${year}-${pad2(month)}-${pad2(day)}T12:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  if (kst.getUTCMonth() + 1 !== month || kst.getUTCDate() !== day) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseKoreanCalendarDate(text: string, now = new Date()): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();

  const fullDate = normalized.match(/(\d{4})\s*(?:년\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (fullDate) {
    return isValidDateKey(parseInt(fullDate[1], 10), parseInt(fullDate[2], 10), parseInt(fullDate[3], 10));
  }

  const isoLike = normalized.match(/(\d{4})\s*[-/.]\s*(\d{1,2})\s*[-/.]\s*(\d{1,2})/);
  if (isoLike) {
    return isValidDateKey(parseInt(isoLike[1], 10), parseInt(isoLike[2], 10), parseInt(isoLike[3], 10));
  }

  const monthDay = normalized.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (monthDay) {
    const month = parseInt(monthDay[1], 10);
    const day = parseInt(monthDay[2], 10);
    return isValidDateKey(inferYearForMonthDay(month, day, now), month, day);
  }

  const slashDate = normalized.match(/(?:^|[^\d])(\d{1,2})\s*[/\-.]\s*(\d{1,2})(?:\s*일)?(?=\s|[^0-9]|$)/);
  if (slashDate) {
    const month = parseInt(slashDate[1], 10);
    const day = parseInt(slashDate[2], 10);
    if (month >= 1 && month <= 12) {
      return isValidDateKey(inferYearForMonthDay(month, day, now), month, day);
    }
  }

  return null;
}

function stripCalendarDateTokens(text: string): string {
  return text
    .replace(/\d{4}\s*(?:년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일/g, " ")
    .replace(/\d{4}\s*[-/.]\s*\d{1,2}\s*[-/.]\s*\d{1,2}/g, " ")
    .replace(/\d{1,2}\s*월\s*\d{1,2}\s*일/g, " ")
    .replace(/(?:^|\s)\d{1,2}\s*[/\-.]\s*\d{1,2}(?:\s*일)?(?=\s|$)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function kstInstantMs(dateKey: string, hour: number, minute: number): number {
  return new Date(`${dateKey}T${pad2(hour)}:${pad2(minute)}:00+09:00`).getTime();
}

function applyMeridiem(hour: number, meridiem?: "오전" | "오후"): number {
  if (meridiem === "오후" && hour < 12) return hour + 12;
  if (meridiem === "오전" && hour === 12) return 0;
  if (meridiem === "오후" && hour === 12) return 12;
  return hour;
}

function inferMeridiemFromText(text: string): "오전" | "오후" | undefined {
  if (/아침|오전|새벽|조회|기상|아침식사|출근|도착/.test(text)) return "오전";
  if (/저녁|오후|밤|야간|점심|회식|저녁식사|퇴근/.test(text)) return "오후";
  return undefined;
}

function resolveAmbiguousHour(
  hour12: number,
  minute: number,
  dateKey: string,
  now: Date,
  text: string,
): { dateKey: string; hour: number; minute: number } {
  const inferred = inferMeridiemFromText(text);
  const h = Math.max(1, Math.min(12, hour12));

  if (inferred) {
    const hour24 = applyMeridiem(h, inferred);
    let dk = dateKey;
    if (kstInstantMs(dk, hour24, minute) < now.getTime() - 60_000) {
      dk = shiftKstDateKey(dk, 1);
    }
    return { dateKey: dk, hour: hour24, minute };
  }

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
  const picked = upcoming[0] ?? candidates.sort((a, b) => a.ms - b.ms)[0];
  return { dateKey: picked.dateKey, hour: picked.hour, minute: picked.minute };
}

function buildScheduleTimestamp(date: string, time: string, isAllDay = false): string {
  if (isAllDay || !time) return new Date(`${date}T00:00:00+09:00`).toISOString();
  return new Date(`${date}T${time}:00+09:00`).toISOString();
}

function stripScheduleTokens(normalized: string): string {
  return stripCalendarDateTokens(
    normalized
    .replace(/내일|모레|오늘|어제/g, " ")
    .replace(/(\d+)\s*분\s*(?:뒤|후|뒤에|이후)/g, " ")
    .replace(/(\d+)\s*시간\s*(?:반)?\s*(?:뒤|후|뒤에|이후)?/g, " ")
    .replace(/반\s*시간\s*(?:뒤|후)/g, " ")
    .replace(/종일|하루\s*종일/g, " ")
    .replace(/(오전|오후)?\s*\d{1,2}\s*시(\s*\d{1,2}\s*분)?\s*에/g, " ")
    .replace(/(오전|오후)?\s*\d{1,2}\s*시(\s*\d{1,2}\s*분)?/g, " ")
    .replace(/^\s*에\s+/g, "")
    .replace(/\s+에\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim(),
  );
}

function hasExplicitScheduleTime(text: string): boolean {
  const normalized = text.trim();
  if (/(\d+|[한두세네다섯여섯일곱여덟아홉십]+)\s*분\s*(?:뒤|후|뒤에|이후)/.test(normalized)) return true;
  if (/(\d+|[한두세네다섯여섯일곱여덟아홉십]+)\s*시간\s*(?:반)?\s*(?:뒤|후|뒤에|이후)?/.test(normalized)) return true;
  if (/반\s*시간\s*(?:뒤|후|뒤에)/.test(normalized)) return true;
  if (/(?:곧|잠시\s*후|조금\s*뒤|이따)/.test(normalized)) return true;
  if (/(오전|오후)?\s*\d{1,2}\s*:\s*\d{1,2}/.test(normalized)) return true;
  if (/(오전|오후)?\s*\d{1,2}\s*시(?:\s*\d{1,2}\s*분)?/.test(normalized)) return true;
  return false;
}

function parseKoreanScheduleText(text: string, defaultDateKey = "", now = new Date()) {
  const normalized = text.trim();

  const relativeMin = normalized.match(/(\d+)\s*분\s*(?:뒤|후|뒤에|이후)/);
  if (relativeMin) {
    const target = new Date(now.getTime() + parseInt(relativeMin[1], 10) * 60_000);
    const dateStr = formatKstDate(target);
    const timeStr = formatKstTime(target);
    let title = stripScheduleTokens(normalized);
    if (!title) title = "알림";
    return {
      parsed_content: { title, date: dateStr, time: timeStr },
      target_timestamp: buildScheduleTimestamp(dateStr, timeStr, false),
      contact_info: null,
      location_info: null,
      confidence: 0.88,
    };
  }

  const relativeHour = normalized.match(/(\d+)\s*시간\s*(?:반)?\s*(?:뒤|후|뒤에|이후)?/);
  if (relativeHour) {
    const hours = parseInt(relativeHour[1], 10);
    const extra = /반/.test(relativeHour[0]) ? 30 * 60_000 : 0;
    const target = new Date(now.getTime() + hours * 3_600_000 + extra);
    const dateStr = formatKstDate(target);
    const timeStr = formatKstTime(target);
    let title = stripScheduleTokens(normalized);
    if (!title) title = "알림";
    return {
      parsed_content: { title, date: dateStr, time: timeStr },
      target_timestamp: buildScheduleTimestamp(dateStr, timeStr, false),
      contact_info: null,
      location_info: null,
      confidence: 0.88,
    };
  }

  if (/반\s*시간\s*(?:뒤|후)/.test(normalized)) {
    const target = new Date(now.getTime() + 30 * 60_000);
    const dateStr = formatKstDate(target);
    const timeStr = formatKstTime(target);
    let title = stripScheduleTokens(normalized);
    if (!title) title = "알림";
    return {
      parsed_content: { title, date: dateStr, time: timeStr },
      target_timestamp: buildScheduleTimestamp(dateStr, timeStr, false),
      contact_info: null,
      location_info: null,
      confidence: 0.88,
    };
  }

  if (/(?:곧|잠시\s*후|조금\s*뒤)/.test(normalized)) {
    const target = new Date(now.getTime() + 5 * 60_000);
    const dateStr = formatKstDate(target);
    const timeStr = formatKstTime(target);
    let title = stripScheduleTokens(normalized);
    if (!title) title = "알림";
    return {
      parsed_content: { title, date: dateStr, time: timeStr },
      target_timestamp: buildScheduleTimestamp(dateStr, timeStr, false),
      contact_info: null,
      location_info: null,
      confidence: 0.88,
    };
  }

  const dateKey = parseKoreanCalendarDate(normalized, now) ?? resolveKstDateKey(now, normalized, defaultDateKey);
  const timeMatch = normalized.match(/(오전|오후)?\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/);
  const colonMatch = normalized.match(/(오전|오후)?\s*(\d{1,2})\s*:\s*(\d{1,2})/);
  const hasExplicitTime = !!(timeMatch || colonMatch);
  const isAllDay = !hasExplicitTime || /종일|하루\s*종일|종일로/.test(normalized);

  let dateStr = dateKey;
  let timeStr = "";

  if (timeMatch && !isAllDay) {
    const hour12 = parseInt(timeMatch[2], 10);
    const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const meridiem = timeMatch[1] as "오전" | "오후" | undefined;
    if (meridiem) {
      const hour24 = applyMeridiem(Math.max(1, Math.min(12, hour12)), meridiem);
      let dk = dateKey;
      if (kstInstantMs(dk, hour24, minute) < now.getTime() - 60_000) {
        dk = shiftKstDateKey(dk, 1);
      }
      dateStr = dk;
      timeStr = formatKstWallTime(hour24, minute);
    } else {
      const picked = resolveAmbiguousHour(hour12, minute, dateKey, now, normalized);
      dateStr = picked.dateKey;
      timeStr = formatKstWallTime(picked.hour, picked.minute);
    }
  } else if (colonMatch && !isAllDay) {
    const hour12 = parseInt(colonMatch[2], 10);
    const minute = parseInt(colonMatch[3], 10);
    const meridiem = colonMatch[1] as "오전" | "오후" | undefined;
    if (meridiem) {
      const hour24 = applyMeridiem(Math.max(1, Math.min(12, hour12)), meridiem);
      let dk = dateKey;
      if (kstInstantMs(dk, hour24, minute) < now.getTime() - 60_000) {
        dk = shiftKstDateKey(dk, 1);
      }
      dateStr = dk;
      timeStr = formatKstWallTime(hour24, minute);
    } else {
      const picked = resolveAmbiguousHour(hour12, minute, dateKey, now, normalized);
      dateStr = picked.dateKey;
      timeStr = formatKstWallTime(picked.hour, picked.minute);
    }
  } else {
    timeStr = "";
  }

  let title = stripScheduleTokens(normalized);
  if (!title) title = "새 일정";

  const phoneMatch = normalized.match(/(01[0-9]-?\d{3,4}-?\d{4})/);
  const contactNameMatch = title.match(/^([가-힣]{2,4})(?:\s|$)/);

  return {
    parsed_content: {
      title,
      date: dateStr,
      time: timeStr,
      is_all_day: isAllDay || undefined,
    },
    target_timestamp: buildScheduleTimestamp(dateStr, timeStr, isAllDay),
    contact_info: contactNameMatch || phoneMatch
      ? { name: contactNameMatch?.[1] ?? null, phone: phoneMatch?.[1] ?? null, email: null }
      : null,
    location_info: null,
    confidence: 0.75,
  };
}

async function transcribeWithWhisper(apiKey: string, audioBytes: Uint8Array, filename: string) {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: "audio/m4a" }), filename);
  form.append("model", "whisper-1");
  form.append("language", "ko");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper failed: ${await res.text()}`);
  const data = await res.json();
  return data.text as string;
}

async function parseWithGpt(apiKey: string, text: string, defaultDateKey = "") {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract schedule JSON from Korean text. Return JSON: {title, date(YYYY-MM-DD), time(HH:mm or empty), is_all_day(boolean), notes?, contact_name?, phone?}. Use Asia/Seoul. Support calendar dates like '7월 24일', '7/24', relative times like '30분 뒤', '1시간 후'. If no specific time needed use is_all_day:true and empty time. defaultDateKey: " +
            (defaultDateKey || "none"),
        },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GPT failed: ${await res.text()}`);
  const data = await res.json();
  const content = JSON.parse(data.choices[0].message.content);
  const isAllDay = content.is_all_day === true || !content.time;
  const date = content.date || defaultDateKey || formatKstDate(new Date());
  const target = isAllDay
    ? new Date(`${date}T00:00:00+09:00`)
    : new Date(`${date}T${content.time}:00+09:00`);
  return {
    parsed_content: {
      title: content.title || "새 일정",
      date,
      time: isAllDay ? "" : content.time,
      notes: content.notes,
      is_all_day: isAllDay || undefined,
    },
    target_timestamp: target.toISOString(),
    contact_info: content.contact_name || content.phone
      ? { name: content.contact_name ?? null, phone: content.phone ?? null, email: null }
      : null,
    location_info: null,
    confidence: 0.92,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    let text = "";
    let defaultDateKey = "";
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      text = (form.get("text") as string) || "";
      defaultDateKey = (form.get("defaultDateKey") as string) || "";
      const audio = form.get("audio");
      if (audio instanceof File && audio.size > 0) {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        const bytes = new Uint8Array(await audio.arrayBuffer());
        if (openaiKey) {
          text = await transcribeWithWhisper(openaiKey, bytes, audio.name || "recording.m4a");
        } else if (!text) {
          return new Response(
            JSON.stringify({ error: "OPENAI_API_KEY not configured. Send text field for fallback parsing." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    } else {
      const body = await req.json();
      text = body.text || "";
      defaultDateKey = body.defaultDateKey || "";

      if (!text.trim() && body.audioBase64) {
        const openaiKey = Deno.env.get("OPENAI_API_KEY");
        const binary = Uint8Array.from(atob(body.audioBase64), (c) => c.charCodeAt(0));
        const filename = body.audioFileName || "recording.m4a";
        if (openaiKey) {
          text = await transcribeWithWhisper(openaiKey, binary, filename);
        } else {
          return new Response(
            JSON.stringify({ error: "OPENAI_API_KEY not configured. Send text field for fallback parsing." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "No speech text to parse" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const hasExplicitKoreanTime = /(오전|오후)?\s*\d{1,2}\s*시/.test(text.trim());
    const hasTime = hasExplicitScheduleTime(text.trim());
    const hasCalendar = parseKoreanCalendarDate(text.trim()) !== null;
    let parsed;
    try {
      if (!hasTime || hasExplicitKoreanTime || hasCalendar) {
        parsed = parseKoreanScheduleText(text, defaultDateKey);
      } else {
        parsed = openaiKey
          ? await parseWithGpt(openaiKey, text, defaultDateKey)
          : parseKoreanScheduleText(text, defaultDateKey);
      }
      if (!hasTime) {
        parsed.parsed_content.is_all_day = true;
        parsed.parsed_content.time = "";
        parsed.target_timestamp = buildScheduleTimestamp(
          parsed.parsed_content.date,
          "",
          true,
        );
      }
    } catch {
      parsed = parseKoreanScheduleText(text, defaultDateKey);
    }

    const { data: profile } = await supabase.from("profiles").select("plan_type").eq("id", userId).single();
    if (profile?.plan_type === "starter") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("voice_parse_usage")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("parsed_at", startOfDay.toISOString());
      if ((count ?? 0) >= 20) {
        return new Response(JSON.stringify({ error: "Daily voice parse limit reached (20/day)" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await supabase.from("voice_parse_usage").insert({ user_id: userId });

    return new Response(
      JSON.stringify({ schedule: { raw_text: text, ...parsed }, confidence: parsed.confidence }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
