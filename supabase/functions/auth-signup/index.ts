import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return jsonResponse({ error: "이메일과 비밀번호를 입력해 주세요." }, 400);
    }

    if (password.length < 6) {
      return jsonResponse({ error: "비밀번호는 6자 이상이어야 합니다." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: "서버 설정이 올바르지 않습니다." }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const message = createError.message.toLowerCase();
      if (message.includes("already") || message.includes("registered")) {
        return jsonResponse({ error: "이미 가입된 이메일입니다. 로그인해 주세요." }, 400);
      }
      return jsonResponse({ error: createError.message }, 400);
    }

    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !data.session) {
      return jsonResponse(
        { error: signInError?.message ?? "가입 후 로그인에 실패했습니다." },
        400,
      );
    }

    return jsonResponse({
      session: data.session,
      user: data.user,
    });
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
