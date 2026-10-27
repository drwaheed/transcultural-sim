/* Facilitator Console — data layer. Cloud (Supabase, RLS-enforced) when signed in; local store otherwise (demo / offline). */
(function(){
'use strict';
const T=window.TCS, E=window.TCS_ENGINE, L=(a,e)=>T.L(a,e);
const K={}; window.TCS_CON=K;
const DEF_ENV={currentCycle:1,mode:'research',modules:{},scenarios:{},features:{tutor:true,voice:true,hints:true,tts:true,badges:true},llm:{enabled:false,configured:false,model:'gpt-4o-2024-08-06',temperature:0.6}};
K.DEF_ENV=DEF_ENV;
K.store=()=>{ const d=T.db; if(!d.console) d.console={}; const c=d.console;
  c.env=Object.assign({},DEF_ENV,c.env||{}); ['features','llm','modules','scenarios'].forEach(k=>c.env[k]=Object.assign({},DEF_ENV[k],c.env[k]||{}));
  ['announcements','schedules','notes','audit','commands'].forEach(k=>c[k]=c[k]||[]); c.profiles=c.profiles||{}; return c; };
const CL=()=>window.TCS_CLOUD; K.cloud=()=>!!(CL()&&CL().enabled&&CL().client&&CL().profile);
K.isFacCloud=()=>K.cloud()&&CL().isFacRole();
K.env=()=>K.store().env;
K.me=()=>K.cloud()?CL().profile.username:'local-facilitator';
const TBL={announcements:'announcements',schedules:'schedules',notes:'student_notes',audit:'audit_log'};
async function q(p){ const {data,error}=await p; if(error) throw error; return data; }
/* ---------- load console data ---------- */
K.load=async()=>{ if(!K.cloud()) return K.store(); const c=K.store(), sb=CL().client, fac=CL().isFacRole();
  try{ const ss=await sb.auth.getSession(); K.token=ss.data&&ss.data.session&&ss.data.session.access_token; }catch(e){}
  const env=await q(sb.from('app_settings').select('value').eq('key','env').maybeSingle()); if(env) c.env=Object.assign({},DEF_ENV,env.value);
  K.store();
  c.announcements=await q(sb.from('announcements').select('*').order('created_at',{ascending:false}));
  c.schedules=await q(sb.from('schedules').select('*').order('starts_at'));
  if(fac){ c.notes=await q(sb.from('student_notes').select('*').order('created_at',{ascending:false}));
    c.audit=await q(sb.from('audit_log').select('*').order('at',{ascending:false}).limit(1000));
    const pr=await q(sb.from('profiles').select('username,role,student_code,team_code,consent,disabled,last_seen_at,must_change_password'));
    c.profiles={}; pr.forEach(p=>c.profiles[p.username]=p); }
  else applyStudentEnv();
  return c; };
function applyStudentEnv(){ const f=K.env().features, s=T.db.settings;
  if(!f.voice) s.voiceInput=false; if(!f.tts) s.tts=false;
  if(!f.hints){ s.maxHints=0; s.practiceMaxHints=0; } }
/* ---------- generic write (cloud first, then local mirror) ---------- */
K.add=async(kind,row)=>{ const c=K.store(); row=Object.assign({},row);
  if(K.cloud()){ const d=await q(CL().client.from(TBL[kind]).insert(row).select().single()); c[kind].unshift(d); }
  else { row.id=row.id||T.uid(); row.created_at=row.created_at||new Date().toISOString(); c[kind].unshift(row); }
  T.save(); return c[kind][0]; };
K.upd=async(kind,id,patch)=>{ const c=K.store();
  if(K.cloud()) await q(CL().client.from(TBL[kind]).update(patch).eq('id',id));
  const r=c[kind].find(x=>x.id===id); if(r) Object.assign(r,patch); T.save(); };
K.del=async(kind,id)=>{ const c=K.store();
  if(K.cloud()) await q(CL().client.from(TBL[kind]).delete().eq('id',id));
  c[kind]=c[kind].filter(x=>x.id!==id); T.save(); };
K.audit=async(action,target,details)=>{ const row={action,target:target||null,details:details||{},actor_username:K.me()};
  try{ if(K.cloud()){ row.actor=CL().user.id; const d=await q(CL().client.from('audit_log').insert(row).select().single()); K.store().audit.unshift(d); }
    else { row.id=Date.now(); row.at=new Date().toISOString(); K.store().audit.unshift(row); }
  }catch(e){ console.warn('audit',e); } T.save(); };
K.saveEnv=async(env,what)=>{ const c=K.store(); c.env=env;
  if(K.cloud()) await q(CL().client.from('app_settings').upsert({key:'env',value:env,updated_at:new Date().toISOString(),updated_by:CL().user.id}));
  T.save(true); await K.audit('env_update',what||'env',{what}); };
/* ---------- account administration (Edge Function admin-users; service role stays server-side) ---------- */
K.admin=async(action,body)=>{
  if(K.cloud()){ const {data,error}=await CL().client.functions.invoke('admin-users',{body:Object.assign({action},body)});
    if(error){ let m=error.message; try{ const j=await error.context.json(); m=j.error||m; }catch(e){} throw new Error(m); }
    if(data&&data.error) throw new Error(data.error); await K.load(); return data; }
  // local demo mode: no real accounts exist, simulate and audit
  const p=K.store().profiles[body.username]||(K.store().profiles[body.username]={username:body.username});
  if(action==='set_disabled') p.disabled=!!body.disabled;
  if(action==='reset_password') p.must_change_password=true;
  await K.audit(action==='reset_password'?'reset_password':action==='set_disabled'?(body.disabled?'disable_account':'enable_account'):action,body.username||action,{demo:true});
  return action==='reset_password'?{ok:true,username:body.username,temporaryPassword:'Demo-'+Math.random().toString(36).slice(2,9)+'!',demo:true}:action==='llm_status'?{configured:!!K.env().llm.configured}:{ok:true,demo:true}; };
K.moveTeam=async(code,team)=>{ const R=T.db.roster, s=R.students.find(x=>x.code===code); if(!s) throw new Error('unknown student'); const from=s.team;
  if(K.cloud()) await q(CL().client.from('profiles').update({team_code:team}).eq('student_code',code));
  s.team=team; R.teams.forEach(t=>t.members=t.members.filter(m=>m!==code)); let t=R.teams.find(x=>x.code===team); if(!t){ t={code:team,members:[]}; R.teams.push(t); R.teams.sort((a,b)=>a.code.localeCompare(b.code)); } t.members.push(code); t.members.sort();
  Object.values(K.store().profiles).forEach(p=>{ if(p.student_code===code) p.team_code=team; });
  T.save(true); await K.audit('move_team',code,{from,to:team}); };
K.userOf=code=>{ const p=Object.values(K.store().profiles).find(x=>x.student_code===code); return p?p.username:code.toLowerCase(); };
K.profileOf=code=>Object.values(K.store().profiles).find(x=>x.student_code===code)||null;
/* ---------- live-session commands ---------- */
K.remote=S=>K.isFacCloud()&&S.device!==T.db.meta.device;
K.sendCmd=async(S,cmd)=>{ if(K.cloud()){ await q(CL().client.from('session_commands').insert({session_id:S.id,cmd})); }
  else K.applyCmd(S,cmd); await K.audit('session_'+cmd,S.id,{team:S.team,scenario:S.scenario}); };
K.applyCmd=(S,cmd)=>{ const O=E.Orchestrator; let ok=true;
  S.upd=Date.now();
  if(cmd==='pause'&&S.status==='running') O.pause(S,'facilitator'); else if(cmd==='resume'&&S.status==='paused') O.resume(S,'facilitator');
  else if(cmd==='stop'&&['running','paused'].includes(S.status)){ O.end(S,'stopped'); S.status='debrief'; S.stoppedByFacilitator=true; }
  else if(cmd==='hint') ok=!!O.maybeHint(S,Date.now(),true); else if(cmd==='dp') ok=!!O.forceDP(S); else ok=false; T.save(true); return ok; };
let pollT=null;
K.pollCommands=async()=>{ if(!K.cloud()||CL().isFacRole()) return; const m=location.hash.match(/^#sim\/([^/]+)/); if(!m) return;
  const S=T.db.sessions.find(s=>s.id===m[1]); if(!S||!['running','paused'].includes(S.status)) return;
  try{ const rows=await q(CL().client.from('session_commands').select('*').eq('session_id',S.id).is('done_at',null).order('id'));
    for(const r of rows){ K.applyCmd(S,r.cmd); await q(CL().client.from('session_commands').update({done_at:new Date().toISOString()}).eq('id',r.id));
      T.toast(L('إجراء من الميسّر: ','Facilitator action: ')+r.cmd,'info'); }
    if(rows.length) T.render(); }catch(e){ console.warn('cmd poll',e); } };
/* ---------- student status flags ---------- */
K.studentStats=code=>{ const p=T.prog?T.prog(code):(T.db.progress[code]||{}); const mods=(window.TCS_MODULES||[]);
  const mDone=mods.filter(m=>p.modules&&p.modules[m.id]&&p.modules[m.id].done).length, mSeen=mods.filter(m=>p.modules&&p.modules[m.id]&&(p.modules[m.id].seen||[]).length).length;
  const qz=Object.values(p.quiz||{}).map(x=>x.best).filter(x=>x!=null), qAvg=qz.length?T.mean(qz):null;
  const ses=T.db.sessions.filter(s=>(s.present||s.members||[]).includes(code)||(s.log||[]).some(e=>e.who===code));
  const sesDone=ses.filter(s=>['done','extras','measure'].includes(s.status));
  const cyc=[1,2].map(c=>sesDone.some(s=>s.cycle===c&&s.mode==='research'));
  const turns=ses.reduce((a,s)=>a+(s.log||[]).filter(e=>e.who===code&&e.kind==='student').length,0);
  const warn=ses.some(s=>{ try{ return E.Analytics.earlyWarnings(s).some(w=>w.student===code); }catch(e){ return false; } });
  const obs=T.db.obs.filter(o=>o.student===code).map(o=>({o,sc:E.Tool2.score(o.items)}));
  const pr=K.profileOf(code), seen=pr&&pr.last_seen_at;
  const dates=[].concat(Object.values(p.modules||{}).map(x=>x.at),Object.values(p.quiz||{}).map(x=>x.at),ses.map(s=>s.createdAt),seen?[seen]:[]).filter(Boolean).sort();
  const last=dates[dates.length-1]||null;
  const engage=Math.round(Math.min(100,(mSeen/Math.max(1,mods.length))*35+(qAvg!=null?qAvg*0.25:0)+Math.min(1,turns/30)*25+(cyc.filter(Boolean).length/2)*15));
  const notes=K.store().notes.filter(n=>n.student_code===code); const flagNote=notes.find(n=>n.flag&&n.flag!=='none');
  let status='not_started'; if(mSeen||ses.length||qz.length) status='in_progress'; if(mDone===mods.length&&cyc[0]&&cyc[1]) status='completed';
  const stale=last&&(Date.now()-new Date(last))>10*864e5;
  const atRisk=status!=='completed'&&(warn||(qAvg!=null&&qAvg<50)||(status==='in_progress'&&stale)||(flagNote&&flagNote.flag==='at_risk'));
  if(atRisk) status='at_risk';
  return {code,mDone,mSeen,mTotal:mods.length,qAvg,qN:qz.length,ses,sesDone,cyc,turns,warn,obs,last,engage,status,disabled:!!(pr&&pr.disabled),journal:(p.journal||[]),notes}; };
K.STATUS={not_started:['',['لم يبدأ','Not started']],in_progress:['info',['قيد التقدم','In progress']],completed:['ok',['مكتمل','Completed']],at_risk:['danger',['معرّض للخطر','At risk']]};
K.badge=st=>{ const x=K.STATUS[st]; return '<span class="badge '+x[0]+'">'+(st==='at_risk'?'⚠ ':st==='completed'?'✓ ':'')+T.esc(T.lang()==='ar'?x[1][0]:x[1][1])+'</span>'; };
K.locked=()=>false; // all content open: no module/scenario locks (user decision 2026-10-27)
K.isFacNow=()=>T.isFac();
/* ---------- hooks: cloud pull/sync, presence, LLM proxy, commands poll ---------- */
function hook(){ const C=CL(); if(!C||!C.enabled||hook.done) return; hook.done=true;
  const pull0=C.pull; C.pull=async function(){ const r=await pull0.apply(C,arguments); try{ await K.load(); }catch(e){ console.warn('console load',e); } return r; };
  const sync0=C.sync; let lastTouch=0; C.sync=async function(){ const r=await sync0.apply(C,arguments); if(C.client&&C.profile&&Date.now()-lastTouch>60000){ lastTouch=Date.now(); try{ await C.client.rpc('touch_seen'); }catch(e){} } return r; };
  C.llmProxy=()=>{ const l=K.env().llm; if(!C.profile||!l.enabled||!l.configured||!K.token) return null; const cfg=window.TCS_CLOUD_CONFIG; return {url:cfg.SUPABASE_URL+'/functions/v1/llm-proxy',token:K.token,anon:cfg.SUPABASE_ANON_KEY,temperature:+l.temperature||0.6}; };
  const init0=C.init; C.init=async function(){ const r=await init0.apply(C,arguments); try{ if(C.profile) await K.load(); }catch(e){} if(C.client) C.client.auth.onAuthStateChange((ev,s)=>{ K.token=s&&s.access_token; }); return r; };
  const login0=C.login; C.login=async function(){ const r=await login0.apply(C,arguments); try{ await K.load(); }catch(e){} return r; };
  clearInterval(pollT); pollT=setInterval(K.pollCommands,4000); }
hook();
})();
