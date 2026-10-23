// Edge Function: facilitator-only account administration. The service-role key exists only here (server side).
import { createClient } from 'npm:@supabase/supabase-js@2';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'content-type': 'application/json' } });
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function tempPassword() { const b = crypto.getRandomValues(new Uint8Array(14)); let s = ''; for (let i = 0; i < 13; i++) s += ALPHA[b[i] % ALPHA.length]; return s.slice(0, 7) + '!@#%*-+'[b[13] % 7] + s.slice(7); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!, service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: who, error: we } = await admin.auth.getUser(jwt);
    if (we || !who?.user) return json({ error: 'unauthenticated' }, 401);
    const { data: me } = await admin.from('profiles').select('username,role,disabled').eq('user_id', who.user.id).maybeSingle();
    if (!me || me.role !== 'facilitator' || me.disabled) return json({ error: 'forbidden: facilitator role required' }, 403);
    const body = await req.json().catch(() => ({}));
    const audit = (action: string, target: string, details: Record<string, unknown> = {}) =>
      admin.from('audit_log').insert({ actor: who.user.id, actor_username: me.username, action, target, details });
    const target = async (username: string) => {
      const { data: p } = await admin.from('profiles').select('user_id,username,role,student_code,team_code').eq('username', String(username || '').toLowerCase()).maybeSingle();
      if (!p) throw new Error('unknown user'); return p; };
    switch (body.action) {
      case 'reset_password': {
        const p = await target(body.username);
        if (p.role === 'facilitator' && p.user_id !== who.user.id && !body.allowFacilitator) return json({ error: 'resetting another facilitator requires allowFacilitator' }, 400);
        const pw = typeof body.password === 'string' && body.password.length >= 10 ? body.password : tempPassword();
        const r = await admin.auth.admin.updateUserById(p.user_id, { password: pw }); if (r.error) throw r.error;
        await admin.from('profiles').update({ must_change_password: body.mustChange !== false }).eq('user_id', p.user_id);
        await audit('reset_password', p.username, { custom: typeof body.password === 'string' });
        return json({ ok: true, username: p.username, temporaryPassword: pw });
      }
      case 'set_disabled': {
        const p = await target(body.username); if (p.user_id === who.user.id) return json({ error: 'cannot disable yourself' }, 400);
        const dis = !!body.disabled;
        const r = await admin.auth.admin.updateUserById(p.user_id, { ban_duration: dis ? '876000h' : 'none' }); if (r.error) throw r.error;
        await admin.from('profiles').update({ disabled: dis }).eq('user_id', p.user_id);
        await audit(dis ? 'disable_account' : 'enable_account', p.username);
        return json({ ok: true, username: p.username, disabled: dis });
      }
      case 'set_llm_config': { // stores the LLM provider key server-side only
        const v = { endpoint: String(body.endpoint || 'https://api.openai.com/v1'), apiKey: String(body.apiKey || ''), model: String(body.model || 'gpt-4o-2024-08-06') };
        if (body.clear) await admin.from('private_settings').delete().eq('key', 'llm');
        else await admin.from('private_settings').upsert({ key: 'llm', value: v, updated_at: new Date().toISOString() });
        await audit(body.clear ? 'llm_key_cleared' : 'llm_key_set', 'llm', { endpoint: v.endpoint, model: v.model });
        return json({ ok: true, configured: !body.clear });
      }
      case 'llm_status': { const { data } = await admin.from('private_settings').select('value,updated_at').eq('key', 'llm').maybeSingle();
        return json({ configured: !!data?.value?.apiKey, endpoint: data?.value?.endpoint, model: data?.value?.model, updated_at: data?.updated_at }); }
      default: return json({ error: 'unknown action' }, 400);
    }
  } catch (e) { return json({ error: String((e as Error).message || e) }, 500); }
});
