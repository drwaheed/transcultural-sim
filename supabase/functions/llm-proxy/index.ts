// Edge Function: LLM proxy for signed-in users. The provider key is read server-side from private_settings (never sent to browsers).
import { createClient } from 'npm:@supabase/supabase-js@2';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who } = await admin.auth.getUser(jwt); if (!who?.user) return json({ error: 'unauthenticated' }, 401);
  const { data: prof } = await admin.from('profiles').select('disabled').eq('user_id', who.user.id).maybeSingle(); if (!prof || prof.disabled) return json({ error: 'forbidden' }, 403);
  const { data: env } = await admin.from('app_settings').select('value').eq('key', 'env').maybeSingle();
  if (!env?.value?.llm?.enabled) return json({ error: 'LLM mode is disabled by the facilitator' }, 403);
  const { data: cfg } = await admin.from('private_settings').select('value').eq('key', 'llm').maybeSingle();
  if (!cfg?.value?.apiKey) return json({ error: 'LLM not configured' }, 503);
  const b = await req.json().catch(() => ({}));
  const messages = Array.isArray(b.messages) ? b.messages.slice(-30) : [];
  const r = await fetch(cfg.value.endpoint.replace(/\/+$/, '') + '/chat/completions', { method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + cfg.value.apiKey },
    body: JSON.stringify({ model: cfg.value.model, messages, temperature: Math.min(1.2, Math.max(0, +b.temperature || 0.6)), max_tokens: Math.min(2400, +b.max_tokens || 300), ...(b.response_format ? { response_format: b.response_format } : {}) }) });
  return new Response(await r.text(), { status: r.status, headers: { ...CORS, 'content-type': 'application/json' } });
});
