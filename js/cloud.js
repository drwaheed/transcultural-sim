/* Cloud layer (Supabase): login gate, first-login password change, offline-first sync queue, live cohort pull.
   Inactive unless js/cloud-config.js has SUPABASE_URL + SUPABASE_ANON_KEY. Local storage remains the source of truth while offline. */
(function(){
'use strict';
const T=window.TCS, CFG=window.TCS_CLOUD_CONFIG||{}, L=(a,e)=>T.L(a,e), esc=T.esc;
const SYNC_KEY='tcs.cloud.sync';
const C={ enabled:!!(CFG.SUPABASE_URL&&CFG.SUPABASE_ANON_KEY&&(window.supabase||CFG._client)), client:null, user:null, profile:null, status:'off', pending:0, lastSync:null, lastError:null, busy:false };
window.TCS_CLOUD=C;
/* Accepts "fac1", " FAC1 ", "fac 1", "fac1@nur416.local", "s1", "S01" → canonical username */
const normUser=u=>{ let x=String(u||'').trim().toLowerCase().replace(/\s+/g,''); x=x.replace(/@.*$/,'');
  let m=x.match(/^s(\d{1,2})$/); if(m) x='s'+m[1].padStart(2,'0');
  m=x.match(/^(?:fac|facilitator|f)(\d)$/); if(m) x='fac'+m[1]; return x; };
const email=u=>normUser(u)+'@'+(CFG.EMAIL_DOMAIN||'nur416.local');
C.normUser=normUser;
const isFacLink=()=>/^#?(facilitator|fac-login)\b/i.test(location.hash.slice(1))||/[?&]role=fac/i.test(location.search);
const hashes=()=>{ try{ return JSON.parse(localStorage.getItem(SYNC_KEY)||'{}'); }catch(e){ return {}; } };
const saveHashes=h=>localStorage.setItem(SYNC_KEY,JSON.stringify(h));
C.isFacRole=()=>!!(C.profile&&C.profile.role==='facilitator'&&C.facVerified===true); // role read via RLS + confirmed by server RPC is_facilitator()
/* ---------- auth ---------- */
C.init=async()=>{
  if(!C.enabled) return;
  C.client=CFG._client||window.supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'tcs.cloud.auth'}});
  try{ const {data}=await C.client.auth.getSession(); if(data&&data.session){ C.user=data.session.user; await loadProfile(); } }catch(e){ C.lastError=e.message; }
  C.client.auth.onAuthStateChange((ev,session)=>{ const had=!!C.profile; C.user=session?session.user:null; if(!session){ C.profile=null; C.facVerified=false; sessionStorage.removeItem('tcs.fac'); sessionStorage.removeItem('tcs.stu'); if(had){ setTimeout(()=>{ T.render(); T.toast&&T.toast(L('انتهت الجلسة — سجّل الدخول مجدداً.','Session ended — please sign in again.'),'info'); },0); } } });
  addEventListener('online',()=>C.sync()); addEventListener('offline',()=>setStatus('offline'));
  setInterval(()=>{ if(C.user&&C.profile&&!C.profile.must_change_password) C.sync(); },(CFG.SYNC_INTERVAL_SEC||20)*1000);
};
async function loadProfile(){
  const {data,error}=await C.client.from('profiles').select('*').eq('user_id',C.user.id).maybeSingle();
  if(error) throw error; C.profile=data||null; C.facVerified=false;
  if(C.profile&&C.profile.role==='facilitator'){ const r=await C.client.rpc('is_facilitator'); C.facVerified=!r.error&&r.data===true; }
  applyRole();
}
function applyRole(){ const p=C.profile; if(!p) return;
  if(C.isFacRole()) sessionStorage.setItem('tcs.fac','1'); else sessionStorage.removeItem('tcs.fac');
  if(p.student_code) sessionStorage.setItem('tcs.stu',p.student_code);
  if(p.team_code) sessionStorage.setItem('tcs.lastTeam',p.team_code); }
C.login=async(username,password)=>{
  const {data,error}=await C.client.auth.signInWithPassword({email:email(username),password});
  if(error) throw error; C.user=data.user; await loadProfile(); if(!C.profile) throw new Error(L('لا يوجد ملف تعريف لهذا الحساب. راجع الميسّر.','No profile for this account. Contact the facilitator.'));
  return C.profile; };
C.logout=async()=>{ try{ await C.sync(); }catch(e){} await C.client.auth.signOut(); C.user=null; C.profile=null; sessionStorage.removeItem('tcs.fac'); sessionStorage.removeItem('tcs.stu'); T.render(); };
C.changePassword=async(pw)=>{ if(String(pw).length<(CFG.MIN_PASSWORD||10)) throw new Error(L('كلمة المرور قصيرة جداً.','Password too short.'));
  const {error}=await C.client.auth.updateUser({password:pw}); if(error) throw error;
  const r=await C.client.rpc('mark_password_changed'); if(r.error) throw r.error; C.profile.must_change_password=false; };
/* ---------- push (offline queue = items whose content hash differs from the last successful push) ---------- */
function collect(){ const db=T.db, p=C.profile, fac=C.isFacRole(), out=[];
  db.sessions.forEach(S=>{ if(!fac&&S.team!==p.team_code) return; if(S.status==='prebrief'&&!(S.log||[]).length) return;
    out.push({k:'s:'+S.id,h:T.hash(JSON.stringify(S)),run:async()=>{
      const row={id:S.id,team_code:S.team,cycle:S.cycle,scenario:S.scenario,mode:S.mode,engine:S.engine,model:S.model||null,status:S.status,device:S.device||null,members:S.members,data:S,updated_at:new Date().toISOString()};
      let r=await C.client.from('sessions').upsert(row); if(r.error) throw r.error;
      const logs=(S.log||[]).map(e=>({session_id:S.id,i:e.i,t_ms:Math.round(e.t||0),kind:e.kind,who:e.who||null,to_whom:e.to||null,text:e.text||'',codes:e.codes||[],trust:e.trust??null}));
      for(let i=0;i<logs.length;i+=500){ r=await C.client.from('logs').upsert(logs.slice(i,i+500)); if(r.error) throw r.error; }
      const dps=Object.entries(S.dps||{}).filter(([k,d])=>d.answer).map(([k,d])=>({session_id:S.id,dp:k,opt:d.answer.opt,leininger:d.answer.lein||null,quality:d.answer.q??null,recorded_by:d.answer.by||null,justification:d.answer.just||'',words:d.answer.words||0,revisions:(d.revisions||[]).length,updated_at:new Date().toISOString()}));
      if(dps.length){ r=await C.client.from('decisions').upsert(dps); if(r.error) throw r.error; } }}); });
  if(fac){ db.obs.forEach(o=>out.push({k:'o:'+o.id,h:T.hash(JSON.stringify(o)),run:async()=>{ const r=await C.client.from('observations').upsert({id:o.id,session_id:o.sessionId||null,student_code:o.student,team_code:o.team||null,cycle:o.cycle,scenario:o.scenario||null,phase:o.phase,observer:o.observer,items:o.items,note:o.note||null,ts:o.ts,device:o.device||null}); if(r.error) throw r.error; }}));
    db.external.forEach((x,i)=>{ if(x.synced) return; out.push({k:'x:'+i+':'+T.hash(JSON.stringify(x)),h:'1',run:async()=>{ const r=await C.client.from('external_measures').insert({student_code:x.student,timepoint:x.timepoint,measure:x.measure,value:String(x.value)}); if(r.error) throw r.error; x.synced=true; }}); }); }
  const codes=fac?[]:[p.student_code].filter(Boolean);
  codes.forEach(code=>{ const pr=db.progress[code]; if(!pr) return;
    out.push({k:'p:'+code,h:T.hash(JSON.stringify(pr)),run:async()=>{
      const now=new Date().toISOString(); let r;
      const mp=Object.entries(pr.modules||{}).map(([m,v])=>({student_code:code,module:m,seen:v.seen||[],done:!!v.done,updated_at:now})); if(mp.length){ r=await C.client.from('module_progress').upsert(mp); if(r.error) throw r.error; }
      const qr=Object.entries(pr.quiz||{}).map(([m,v])=>({student_code:code,module:m,best:v.best,last:v.last,n:v.n,updated_at:now})); if(qr.length){ r=await C.client.from('quiz_results').upsert(qr); if(r.error) throw r.error; }
      const rf=(pr.journal||[]).map(j=>({id:j.id,student_code:code,session_id:j.session||null,scenario:j.scenario||null,text:j.text,at:j.at})); if(rf.length){ r=await C.client.from('reflections').upsert(rf); if(r.error) throw r.error; }
      r=await C.client.from('review_state').upsert({student_code:code,review:pr.review||{},badges:pr.badges||[],updated_at:now}); if(r.error) throw r.error; }}); });
  return out; }
C.queue=()=>{ if(!C.user||!C.profile) return []; const h=hashes(); return collect().filter(it=>h[it.k]!==it.h); };
C.push=async()=>{ const h=hashes(); const q=C.queue(); let done=0;
  let firstErr=null; for(const it of q){ try{ await it.run(); h[it.k]=it.h; saveHashes(h); done++; }catch(e){ console.warn('sync item failed',it.k,e&&e.message); firstErr=firstErr||e; } }
  if(firstErr&&!done) throw firstErr;
  if(q.some(it=>it.k.startsWith('x:'))) T.save(true);
  return done; };
/* ---------- pull (facilitator: whole cohort; student: own team + own learning data) ---------- */
async function all(table,sel,filter){ let out=[], from=0; for(;;){ let q=C.client.from(table).select(sel||'*').range(from,from+999); if(filter) q=filter(q); const {data,error}=await q; if(error) throw error; out=out.concat(data||[]); if(!data||data.length<1000) break; from+=1000; } return out; }
C.pull=async()=>{ const fac=C.isFacRole(), p=C.profile; const inc={sessions:[],obs:[],progress:{},external:[]};
  const ses=await all('sessions','data'); inc.sessions=ses.map(r=>r.data).filter(Boolean);
  const prog=code=>inc.progress[code]||(inc.progress[code]={modules:{},quiz:{},review:{},journal:[],badges:[]});
  const codeF=q=>fac?q:q.eq('student_code',p.student_code||'-');
  (await all('module_progress','*',codeF)).forEach(r=>prog(r.student_code).modules[r.module]={seen:r.seen||[],done:r.done,at:r.updated_at});
  (await all('quiz_results','*',codeF)).forEach(r=>prog(r.student_code).quiz[r.module]={best:r.best,last:r.last,n:r.n,at:r.updated_at});
  (await all('reflections','*',codeF)).forEach(r=>prog(r.student_code).journal.push({id:r.id,at:r.at,session:r.session_id,scenario:r.scenario,text:r.text}));
  (await all('review_state','*',codeF)).forEach(r=>{ const pp=prog(r.student_code); pp.review=r.review||{}; pp.badges=r.badges||[]; });
  if(fac){
    inc.obs=(await all('observations')).map(o=>({id:o.id,sessionId:o.session_id,student:o.student_code,team:o.team_code,cycle:o.cycle,scenario:o.scenario,phase:o.phase,observer:o.observer,items:o.items,note:o.note,ts:o.ts,device:o.device}));
    const prof=await all('profiles','username,role,student_code,team_code,consent');
    const st=prof.filter(x=>x.role==='student'&&x.student_code);
    if(st.length){ const teams={}; st.forEach(x=>{ if(x.team_code)(teams[x.team_code]=teams[x.team_code]||[]).push(x.student_code); });
      T.db.roster={students:st.map(x=>({code:x.student_code,team:x.team_code,consent:x.consent!==false})).sort((a,b)=>a.code.localeCompare(b.code)),teams:Object.keys(teams).sort().map(k=>({code:k,members:teams[k].sort()}))}; }
    const ext=await all('external_measures'); T.db.external=T.db.external.filter(x=>!x.synced).concat(ext.map(x=>({student:x.student_code,timepoint:x.timepoint,measure:x.measure,value:x.value,synced:true})));
  }
  const before=JSON.stringify([T.db.sessions.length,T.db.obs.length]);
  const st=window.TCS_FAC&&window.TCS_FAC.merge?window.TCS_FAC.merge(inc):null;
  // mark pulled content as already synced so it is not pushed back unchanged
  const h=hashes(); T.db.sessions.forEach(S=>{ if(inc.sessions.some(x=>x.id===S.id&&x.log.length===S.log.length&&(x.upd||0)===(S.upd||0))) h['s:'+S.id]=T.hash(JSON.stringify(S)); }); saveHashes(h);
  T.save(true); return {changed:before!==JSON.stringify([T.db.sessions.length,T.db.obs.length]),st}; };
function setStatus(s,err){ C.status=s; C.lastError=err||null; C.pending=C.user&&C.profile?C.queue().length:0; const el=document.getElementById('cloudChip'); if(el) el.outerHTML=chip(); }
C.sync=async(opts)=>{ if(!C.enabled||!C.user||!C.profile||C.busy) return; if(!navigator.onLine){ setStatus('offline'); return; }
  C.busy=true; setStatus('syncing');
  try{ await C.push(); const r=(opts&&opts.pull)||C.isFacRole()?await C.pull():null; C.lastSync=new Date().toISOString(); setStatus('ok'); C.busy=false; return r; }
  catch(e){ C.busy=false; setStatus('error',e.message||String(e)); return null; } };
function chip(){ if(!C.enabled) return '<span id="cloudChip" hidden></span>';
  const m={off:['',L('غير متصل بالسحابة','Cloud off')],syncing:['info',L('جارٍ المزامنة…','Syncing…')],ok:['ok',L('متزامن','Synced')],offline:['warn',L('دون اتصال — في الطابور ','Offline — queued ')+C.pending],error:['danger',L('خطأ مزامنة','Sync error')]}[C.status]||['',''];
  return '<a id="cloudChip" href="#account" class="badge '+m[0]+'" title="'+esc(C.lastError||'')+'" aria-live="polite">☁ '+esc(m[1])+(C.status==='ok'&&C.pending?' · '+C.pending:'')+'</a>'; }
C.chip=chip;
/* ---------- integrate with core: save → schedule sync; facilitator by role; login gate ---------- */
if(C.enabled){
  const save0=T.save; let t=null; T.save=function(now){ save0.apply(T,arguments); clearTimeout(t); t=setTimeout(()=>C.sync(),now?800:3000); };
  const isFac0=T.isFac; T.isFac=()=>C.profile?C.isFacRole():isFac0(); // role-based: no PIN when signed in
  T.pinDlg=async()=>{ if(C.isFacRole()){ sessionStorage.setItem('tcs.fac','1'); return true; } T.toast(L('هذه المنطقة للميسّرين فقط — سجّل الدخول بحساب ميسّر.','Facilitators only — sign in with a facilitator account.'),'danger'); return false; }; // no PIN fallback on the cloud site
  const render0=T.render; let lastPull=0;
  T.render=function(){ const main=document.getElementById('main'); const h=(location.hash||'#home').slice(1).split('/')[0];
    const gated=CFG.REQUIRE_LOGIN!==false&&(!C.user||!C.profile); document.body.classList.toggle('gated',gated||!!(C.profile&&C.profile.must_change_password));
    if(gated){ if(window.TCS_UI&&TCS_UI.beforeRoute) TCS_UI.beforeRoute('login'); loginView(main); return; }
    if(C.profile.must_change_password){ pwView(main,true); return; }
    if(h==='facilitator'||h==='fac-login'){ location.replace('#'+(C.isFacRole()?'fac':'hub')); return; }
    if(h==='account'){ accountView(main); return; }
    if(h==='fac'&&!C.isFacRole()){ location.replace('#hub'); setTimeout(()=>T.toast(L('لوحة الميسّر متاحة لحسابات الميسّرين فقط.','The Facilitator Console is for facilitator accounts only.'),'danger'),50); return; }
    render0.apply(T,arguments); const tools=document.querySelector('.appbar .tools'); if(tools&&!document.getElementById('cloudChip')) tools.insertAdjacentHTML('afterbegin',chip());
    if(tools&&!document.getElementById('soBtn')){ tools.insertAdjacentHTML('beforeend','<button type="button" class="btn btn-ghost btn-sm" id="soBtn">⎋ '+L('خروج','Sign out')+' <span class="xs muted">('+esc(C.profile.username)+')</span></button>'); document.getElementById('soBtn').onclick=()=>C.logout(); }
    if(h==='fac'&&C.isFacRole()&&Date.now()-lastPull>15000){ lastPull=Date.now(); C.sync({pull:true}).then(r=>{ if(r&&r.changed&&location.hash.startsWith('#fac')) render0.apply(T); }); } };
}
function loginView(main){
  let role=isFacLink()?'fac':(localStorage.getItem('tcs.loginRole')==='fac'?'fac':'stu');
  const B=(ar,en)=>'<span lang="ar" dir="rtl">'+ar+'</span> <span class="muted">/</span> <span lang="en" dir="ltr">'+en+'</span>';
  const draw=()=>{ const fac=role==='fac';
  main.innerHTML='<div class="auth-wrap"><form class="card" id="lf" style="max-width:460px;margin:var(--s6) auto" novalidate data-role="'+role+'">'+
  '<h1>'+(fac?L('دخول الميسّر','Facilitator sign-in'):L('تسجيل الدخول','Sign in'))+'</h1>'+
  '<div class="tabs" role="tablist" aria-label="'+L('نوع الحساب','Account type')+'" style="margin-bottom:var(--s4)">'+
   '<button type="button" role="tab" id="tabStu" aria-selected="'+!fac+'" tabindex="'+(fac?-1:0)+'">🎓 '+L('طالب','Student')+'</button>'+
   '<button type="button" role="tab" id="tabFac" aria-selected="'+fac+'" tabindex="'+(fac?0:-1)+'">🧑‍🏫 '+L('ميسّر','Facilitator')+'</button></div>'+
  '<p class="small muted" id="lHint">'+(fac?L('اكتب اسم مستخدم الميسّر (fac1 أو fac2) وكلمة المرور. ستفتح لوحة الميسّر مباشرة بعد الدخول — لا حاجة لرمز PIN.','Type your facilitator username (fac1 or fac2) and password. The Facilitator Console opens right after sign-in — no PIN needed.'):L('استخدم اسم المستخدم وكلمة المرور اللذين تسلمتهما من الميسّر (مثل s01).','Use the username and password from your facilitator (e.g., s01).'))+'</p>'+
  '<label class="fld"><span>'+L('اسم المستخدم','Username')+'</span><input name="u" type="text" class="ltr mono" placeholder="'+(fac?'fac1':'s01')+'" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required aria-describedby="lHint lErr"></label>'+
  '<label class="fld" for="lp"><span>'+L('كلمة المرور','Password')+'</span></label><div style="display:flex;gap:var(--s2);margin-top:-8px;margin-bottom:var(--s4)"><input id="lp" name="p" type="password" class="ltr" style="flex:1" autocomplete="current-password" required aria-describedby="lErr">'+
   '<button type="button" class="btn btn-ghost" id="eye" aria-pressed="false" aria-controls="lp">'+L('إظهار','Show')+'</button></div>'+
  '<div id="lErr" role="alert" aria-live="assertive" class="err small"></div><button type="submit" id="lGo" class="btn btn-primary btn-lg" style="width:100%">'+(fac?L('دخول إلى لوحة الميسّر','Sign in to Facilitator Console'):L('دخول','Sign in'))+'</button>'+
  '<p class="xs muted" style="margin-top:var(--s3)">'+(fac?L('نسيت كلمة المرور؟ يعيد الميسّر الآخر تعيينها من لوحة الميسّر، أو من لوحة Supabase.','Forgot your password? The other facilitator can reset it in the console, or via Supabase.'):L('نسيت كلمة المرور؟ يعيد الميسّر تعيينها من لوحة الميسّر.','Forgot your password? Your facilitator can reset it from the Facilitator Console.'))+'</p>'+
  '<p class="xs" style="margin-top:var(--s2)"><a href="'+(fac?'#home':'#facilitator')+'" id="swLink">'+(fac?L('أنا طالب ←','I am a student →'):L('هل أنت ميسّر؟ ادخل من هنا ←','Are you a facilitator? Sign in here →'))+'</a></p></form></div>';
  const f=main.querySelector('#lf'); f.u.focus();
  const setRole=r=>{ const keep=[f.u.value,f.p.value]; role=r; localStorage.setItem('tcs.loginRole',r); draw(); const g=main.querySelector('#lf'); g.u.value=keep[0]; g.p.value=keep[1]; main.querySelector(r==='fac'?'#tabFac':'#tabStu').focus(); };
  main.querySelector('#tabStu').onclick=()=>setRole('stu'); main.querySelector('#tabFac').onclick=()=>setRole('fac');
  main.querySelector('[role=tablist]').onkeydown=e=>{ if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){ e.preventDefault(); setRole(role==='fac'?'stu':'fac'); } };
  main.querySelector('#swLink').onclick=e=>{ e.preventDefault(); setRole(fac?'stu':'fac'); };
  const eye=main.querySelector('#eye'); eye.onclick=()=>{ const show=f.p.type==='password'; f.p.type=show?'text':'password'; eye.setAttribute('aria-pressed',show); eye.textContent=show?L('إخفاء','Hide'):L('إظهار','Show'); f.p.focus(); };
  f.onsubmit=async e=>{ e.preventDefault(); const err=main.querySelector('#lErr'); err.innerHTML=''; const b=main.querySelector('#lGo'), label=b.textContent;
    const u=normUser(f.u.value); if(!u||!f.p.value){ err.innerHTML=B('اكتب اسم المستخدم وكلمة المرور.','Enter your username and password.'); (u?f.p:f.u).focus(); return; }
    b.disabled=true; b.textContent=L('جارٍ الدخول…','Signing in…');
    try{ const p=await C.login(u,f.p.value);
      if(p.role==='facilitator'){ localStorage.setItem('tcs.loginRole','fac'); if(!location.hash.startsWith('#fac')||location.hash.startsWith('#facilitator')) history.replaceState(null,'',location.pathname+location.search+'#fac'); }
      else { localStorage.setItem('tcs.loginRole','stu'); if(/^#(fac|facilitator)/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search+'#hub');
        if(fac) setTimeout(()=>T.toast(L('هذا حساب طالب، فُتحت صفحة الطالب.','This is a student account — opened the student area.')),300); }
      window.TCS_UI.shell(); T.render(); C.sync({pull:true}).then(r=>{ if(r&&r.changed) T.render(); }); }
    catch(x){ const m=String(x&&x.message||x);
      err.innerHTML=/Invalid login|invalid_credentials/i.test(m)?B('اسم المستخدم أو كلمة المرور غير صحيحة. تأكّد من الأحرف الكبيرة والصغيرة في كلمة المرور.','Incorrect username or password. Passwords are case-sensitive.')
        :/banned|disabled/i.test(m)?B('هذا الحساب موقوف. تواصل مع الميسّر.','This account is disabled. Contact the facilitator.')
        :(!navigator.onLine||/fetch|network/i.test(m))?B('لا يوجد اتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.','Cannot reach the server. Check your internet and try again.')
        :esc(m);
      f.p.value=''; f.p.focus(); b.disabled=false; b.textContent=label; } }; };
  draw(); }
function pwView(main,first){
  main.innerHTML='<form class="card" id="pf" style="max-width:480px;margin:var(--s6) auto"><h1>'+(first?L('غيّر كلمة المرور المؤقتة','Change your temporary password'):L('تغيير كلمة المرور','Change password'))+'</h1>'+(first?'<p class="small">'+L('هذا أول دخول لك. اختر كلمة مرور جديدة خاصة بك.','This is your first sign-in. Choose your own new password.')+'</p>':'')+
  '<label class="fld"><span>'+L('كلمة المرور الجديدة','New password')+'</span><input name="a" type="password" class="ltr" autocomplete="new-password" minlength="'+(CFG.MIN_PASSWORD||10)+'" required aria-describedby="pwH"></label><p id="pwH" class="xs muted">'+L('10 أحرف على الأقل، ويفضّل عبارة يسهل تذكرها.','At least 10 characters; a memorable passphrase is best.')+'</p>'+
  '<label class="fld"><span>'+L('تأكيد كلمة المرور','Confirm password')+'</span><input name="b" type="password" class="ltr" autocomplete="new-password" required></label><div id="pErr" role="alert" class="err small"></div>'+
  '<div class="btn-row"><button class="btn btn-primary">'+L('حفظ','Save')+'</button>'+(first?'<button type="button" class="btn btn-ghost" id="lo">'+L('خروج','Sign out')+'</button>':'<a class="btn btn-ghost" href="#account">'+L('إلغاء','Cancel')+'</a>')+'</div></form>';
  const f=main.querySelector('#pf'); f.a.focus(); const lo=main.querySelector('#lo'); if(lo) lo.onclick=()=>C.logout();
  f.onsubmit=async e=>{ e.preventDefault(); const err=main.querySelector('#pErr'); if(f.a.value!==f.b.value){ err.textContent=L('كلمتا المرور غير متطابقتين.','Passwords do not match.'); f.b.focus(); return; }
    try{ await C.changePassword(f.a.value); T.toast(L('تم تغيير كلمة المرور','Password changed'),'ok'); location.hash=C.isFacRole()?'#fac':'#hub'; T.render(); }catch(x){ err.textContent=x.message; } }; }
function accountView(main){ const p=C.profile; const q=C.queue();
  main.innerHTML='<h1>'+L('حسابي والمزامنة','Account & sync')+'</h1><div class="grid g2"><div class="card"><dl class="kv"><dt>'+L('المستخدم','User')+'</dt><dd class="mono">'+esc(p.username)+'</dd><dt>'+L('الدور','Role')+'</dt><dd>'+esc(p.role)+'</dd>'+(p.student_code?'<dt>'+L('الرمز','Code')+'</dt><dd class="mono">'+esc(p.student_code)+'</dd><dt>'+L('الفريق','Team')+'</dt><dd class="mono">'+esc(p.team_code||'—')+'</dd>':'')+'</dl><div class="btn-row"><button class="btn btn-secondary" id="cp">🔑 '+L('تغيير كلمة المرور','Change password')+'</button><button class="btn btn-ghost" id="lo">'+L('خروج','Sign out')+'</button></div></div>'+
  '<div class="card"><h2 class="h3">☁ '+L('المزامنة السحابية','Cloud sync')+'</h2><p>'+chip()+'</p><p class="small">'+L('عناصر في الطابور: ','Queued items: ')+'<b>'+q.length+'</b> · '+L('آخر مزامنة: ','Last sync: ')+(C.lastSync?T.fmtDate(C.lastSync):'—')+'</p>'+(C.lastError?'<p class="err small">'+esc(C.lastError)+'</p>':'')+'<button class="btn btn-primary" id="sn">⟳ '+L('مزامنة الآن','Sync now')+'</button><p class="xs muted">'+L('يعمل التطبيق دون اتصال ويحفظ محلياً، ثم يرفع التغييرات تلقائياً عند عودة الاتصال.','The app works offline and saves locally, then uploads changes automatically when back online.')+'</p></div></div>';
  main.querySelector('#cp').onclick=()=>pwView(main,false); main.querySelector('#lo').onclick=()=>C.logout();
  main.querySelector('#sn').onclick=async()=>{ await C.sync({pull:true}); accountView(main); }; }
})();
