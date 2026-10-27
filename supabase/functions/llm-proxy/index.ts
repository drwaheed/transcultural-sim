// Edge Function: LLM proxy for signed-in users. The provider key is read server-side from private_settings (never sent to browsers).
import { createClient } from 'npm:@supabase/supabase-js@2';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who } = await admin.auth.getUser(jwt); if (!who?.user) return json({ error: 'unauthenticated' }, 401);
  const { data: prof } = await admin.from('profiles').select('disabled,role').eq('user_id', who.user.id).maybeSingle(); if (!prof || prof.disabled) return json({ error: 'forbidden' }, 403);
  const b = await req.json().catch(() => ({}));
  const facTest = b.test === true && ['facilitator', 'admin'].includes(prof.role); // facilitators may run a verification call while LLM mode is still off
  const { data: env } = await admin.from('app_settings').select('value').eq('key', 'env').maybeSingle();
  if (!env?.value?.llm?.enabled && !facTest) return json({ error: 'LLM mode is disabled by the facilitator', fallback: true }, 403);
  const { data: cfg } = await admin.from('private_settings').select('value').eq('key', 'llm').maybeSingle();
  if (!cfg?.value?.apiKey) return json({ error: 'LLM not configured', fallback: true }, 503);
  const messages = Array.isArray(b.messages) ? b.messages.slice(-30) : [];
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000); let r: Response;
  try { r = await fetch((cfg.value.endpoint || 'https://api.openai.com/v1').replace(/\/+$/, '') + '/chat/completions', { method: 'POST', signal: ctrl.signal,
    headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + cfg.value.apiKey },
    body: JSON.stringify({ model: cfg.value.model || 'gpt-4o-mini', messages, temperature: Math.min(1.2, Math.max(0, +b.temperature || 0.6)), max_tokens: Math.min(2400, +b.max_tokens || 300), ...(b.response_format ? { response_format: b.response_format } : {}) }) });
  } catch (e) { return json({ error: 'provider timeout/network', fallback: true }, 504); } finally { clearTimeout(timer); }
  const txt = await r.text();
  if (!r.ok) { let code = ''; try { code = JSON.parse(txt)?.error?.code || JSON.parse(txt)?.error?.type || ''; } catch (_) {} return json({ error: 'provider error', status: r.status, code, fallback: true }, r.status); } // never forwards provider details/keys
  return new Response(txt, { status: 200, headers: { ...CORS, 'content-type': 'application/json' } });
});
