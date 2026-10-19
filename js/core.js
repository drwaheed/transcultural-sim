/* Core: store, i18n helper, utilities, router, dialogs, toasts. No external dependencies; works from file://. */
(function(){
'use strict';
const KEY='tcs.v1';
const DEFAULT_SETTINGS={
  lang:'ar', theme:'auto', pin:'2468',
  engine:'offline', endpoint:'https://api.openai.com/v1', apiKey:'', model:'gpt-4o-2024-08-06', temperature:0.6, maxTokens:220,
  simMinutes:35, silenceSec:180, maxHints:2, practiceSilenceSec:90, practiceMaxHints:4,
  researchScenarioC1:'S2', researchScenarioC2:'S5', adaptivePractice:true,
  tts:false, voiceInput:true, showTourOnStart:true,
  cohortSize:80, teamSize:5, studentPrefix:'S', teamPrefix:'T'
};
function blank(){return {version:1, settings:{...DEFAULT_SETTINGS}, roster:{students:[],teams:[]}, sessions:[], obs:[], progress:{}, custom:[], external:[], meta:{created:new Date().toISOString(), device:'D'+Math.random().toString(36).slice(2,7).toUpperCase()}};}
let db;
function load(){
  try{ db=JSON.parse(localStorage.getItem(KEY)||'null'); }catch(e){ db=null; }
  if(!db) db=blank();
  db.settings={...DEFAULT_SETTINGS,...(db.settings||{})};
  ['sessions','obs','custom','external'].forEach(k=>{ if(!Array.isArray(db[k])) db[k]=[]; });
  db.roster=db.roster||{students:[],teams:[]}; db.progress=db.progress||{}; db.meta=db.meta||blank().meta;
  if(!db.roster.students.length) generateRoster(db.settings.cohortSize, db.settings.teamSize, false);
  return db;
}
let saveTimer=null, lastSaveError=null;
function save(now){
  const doit=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(db)); lastSaveError=null; }catch(e){ lastSaveError=e; toast(L('تعذّر الحفظ: مساحة التخزين ممتلئة. صدّر البيانات ثم احذف القديم.','Could not save: storage full. Export data, then remove old sessions.'),'danger'); } };
  if(now){ clearTimeout(saveTimer); doit(); } else { clearTimeout(saveTimer); saveTimer=setTimeout(doit,150); }
}
function pad(n,w){ return String(n).padStart(w,'0'); }
function generateRoster(n, size, shuffle){
  n=Math.max(1,Math.min(400,+n||80)); size=Math.max(2,Math.min(10,+size||5));
  const s=db.settings, w=String(n).length<2?2:String(n).length;
  const codes=[]; for(let i=1;i<=n;i++) codes.push(s.studentPrefix+pad(i,w));
  const order=shuffle?seededShuffle(codes.slice(), Date.now()):codes.slice();
  const nTeams=Math.ceil(n/size), tw=Math.max(2,String(nTeams).length);
  const teams=[]; for(let t=0;t<nTeams;t++) teams.push({code:s.teamPrefix+pad(t+1,tw), members:[]});
  order.forEach((c,i)=>teams[Math.floor(i/size)].members.push(c));
  db.roster={students:codes.map(c=>({code:c, team:teams.find(t=>t.members.includes(c)).code, consent:true})), teams};
  save();
}
function importRosterCSV(text){
  const rows=parseCSV(text).filter(r=>r.length>=2 && r[0].trim());
  if(rows.length && /code|student/i.test(rows[0][0])) rows.shift();
  const students=[], teamMap={};
  for(const r of rows){ const code=r[0].trim().toUpperCase(), team=r[1].trim().toUpperCase(); if(!/^[A-Z0-9_-]{2,12}$/.test(code)||!/^[A-Z0-9_-]{2,12}$/.test(team)) throw new Error('Invalid code: '+r.join(','));
    const consent=r[2]===undefined?true:!/^(0|no|false|n)$/i.test(r[2].trim());
    students.push({code,team,consent}); (teamMap[team]=teamMap[team]||[]).push(code); }
  if(!students.length) throw new Error('Empty roster');
  db.roster={students, teams:Object.keys(teamMap).sort().map(k=>({code:k,members:teamMap[k]}))}; save(true);
  return students.length;
}
function parseCSV(text){
  const out=[]; let row=[], cur='', q=false;
  for(let i=0;i<text.length;i++){ const ch=text[i];
    if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; }
    else if(ch==='"') q=true; else if(ch===','){ row.push(cur); cur=''; } else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cur); out.push(row); row=[]; cur=''; } else cur+=ch; }
  if(cur!==''||row.length){ row.push(cur); out.push(row); }
  return out;
}
function toCSV(rows){ return '\ufeff'+rows.map(r=>r.map(v=>{ v=v==null?'':String(v); return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }).join(',')).join('\r\n'); }
function download(name, content, type){
  const blob=content instanceof Blob?content:new Blob([content],{type:type||'application/octet-stream'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
function seededShuffle(arr, seed){
  let h=typeof seed==='number'?seed:hash(String(seed));
  const rnd=()=>{ h^=h<<13; h^=h>>>17; h^=h<<5; return ((h>>>0)%10000)/10000; };
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
  return arr;
}
function hash(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0||1; }
function uid(p){ return (p||'id')+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function L(ar,en){ return db&&db.settings.lang==='en'?en:ar; }
function lang(){ return db.settings.lang; }
function bi(o){ if(!o) return ''; if(typeof o==='string') return o; return o[lang()]||o.en||o.ar||''; }
function fmtTime(ms){ ms=Math.max(0,ms|0); const s=Math.floor(ms/1000); return pad(Math.floor(s/60),2)+':'+pad(s%60,2); }
function fmtDate(iso){ if(!iso) return '—'; try{ return new Date(iso).toLocaleString(lang()==='ar'?'ar-BH':'en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}); }catch(e){ return iso; } }
function num(v,d){ if(v==null||isNaN(v)) return '—'; return (+v).toFixed(d==null?1:d); }
function mean(a){ a=a.filter(x=>x!=null&&!isNaN(x)); return a.length?a.reduce((x,y)=>x+y,0)/a.length:null; }
function sd(a){ a=a.filter(x=>x!=null&&!isNaN(x)); if(a.length<2) return null; const m=mean(a); return Math.sqrt(a.reduce((s,x)=>s+(x-m)*(x-m),0)/(a.length-1)); }
function scenarios(){ return (window.TCS_SCENARIOS||[]).concat((db.custom||[]).map(c=>({...c,custom:true}))); }
function scenario(id){ return scenarios().find(s=>s.id===id); }
function module(id){ return (window.TCS_MODULES||[]).find(m=>m.id===id); }
function teamOf(code){ const s=db.roster.students.find(x=>x.code===code); return s?s.team:null; }
function team(code){ return db.roster.teams.find(t=>t.code===code); }
function prog(code){ code=String(code||'').toUpperCase(); if(!db.progress[code]) db.progress[code]={modules:{},quiz:{},review:{},journal:[],badges:[],sbar:[]}; const p=db.progress[code]; ['modules','quiz','review'].forEach(k=>p[k]=p[k]||{}); ['journal','badges','sbar'].forEach(k=>p[k]=p[k]||[]); return p; }
/* ---------- toasts & live region ---------- */
function announce(msg){ const r=document.getElementById('sr-live'); if(r){ r.textContent=''; setTimeout(()=>r.textContent=msg,30); } }
function toast(msg, kind, action){
  const host=document.getElementById('toasts'); if(!host) return;
  const el=document.createElement('div'); el.className='toast '+(kind||'info'); el.setAttribute('role',kind==='danger'?'alert':'status');
  el.innerHTML='<span>'+esc(msg)+'</span>';
  if(action){ const b=document.createElement('button'); b.className='btn btn-sm btn-ghost'; b.textContent=action.label; b.onclick=()=>{ action.fn(); el.remove(); }; el.appendChild(b); }
  const x=document.createElement('button'); x.className='icon-btn'; x.setAttribute('aria-label',L('إغلاق','Close')); x.textContent='×'; x.onclick=()=>el.remove(); el.appendChild(x);
  host.appendChild(el); setTimeout(()=>el.remove(), action?9000:5000);
}
/* ---------- dialogs (native <dialog>, focus returns to opener) ---------- */
function dialog({title, body, actions, wide, onOpen}){
  return new Promise(resolve=>{
    const d=document.createElement('dialog'); d.className='dlg'+(wide?' wide':''); const opener=document.activeElement;
    const tid=uid('dlgt');
    d.setAttribute('aria-labelledby',tid);
    d.innerHTML='<form method="dialog" class="dlg-inner"><header class="dlg-h"><h2 id="'+tid+'">'+esc(title)+'</h2><button class="icon-btn" value="__x" aria-label="'+L('إغلاق','Close')+'">×</button></header><div class="dlg-b"></div><footer class="dlg-f"></footer></form>';
    const b=d.querySelector('.dlg-b'); if(typeof body==='string') b.innerHTML=body; else if(body) b.appendChild(body);
    const f=d.querySelector('.dlg-f');
    (actions||[{label:L('حسناً','OK'),value:'ok',primary:true}]).forEach(a=>{ const btn=document.createElement('button'); btn.className='btn '+(a.primary?'btn-primary':a.danger?'btn-danger':'btn-secondary'); btn.value=a.value; btn.textContent=a.label; f.appendChild(btn); });
    d.addEventListener('close',()=>{ const v=d.returnValue; const data={}; d.querySelectorAll('input,textarea,select').forEach(i=>{ if(i.name) data[i.name]=i.type==='checkbox'?i.checked:i.value; }); d.remove(); if(opener&&opener.focus) opener.focus(); resolve(v==='__x'||!v?null:{value:v,data}); });
    document.body.appendChild(d); d.showModal(); if(onOpen) onOpen(d);
    const first=d.querySelector('.dlg-b input,.dlg-b textarea,.dlg-b select,.dlg-f .btn-primary'); if(first) first.focus();
  });
}
async function confirmDlg(title, msg, dangerLabel){
  const r=await dialog({title, body:'<p>'+esc(msg)+'</p>', actions:[{label:L('إلغاء','Cancel'),value:'cancel'},{label:dangerLabel||L('تأكيد','Confirm'),value:'ok',danger:true}]});
  return r&&r.value==='ok';
}
async function pinDlg(){
  if(sessionStorage.getItem('tcs.fac')==='1') return true;
  const r=await dialog({title:L('دخول الميسّر','Facilitator sign-in'), body:'<label class="fld"><span>'+L('رمز PIN للميسّر','Facilitator PIN')+'</span><input name="pin" type="password" inputmode="numeric" autocomplete="off" required aria-describedby="pinhelp"></label><p id="pinhelp" class="muted small">'+L('الرمز الافتراضي 2468 — غيّره من الإعدادات.','Default PIN is 2468 — change it in Settings.')+'</p>', actions:[{label:L('إلغاء','Cancel'),value:'cancel'},{label:L('دخول','Sign in'),value:'ok',primary:true}]});
  if(r&&r.value==='ok'&&r.data.pin===db.settings.pin){ sessionStorage.setItem('tcs.fac','1'); return true; }
  if(r&&r.value==='ok') toast(L('رمز غير صحيح','Incorrect PIN'),'danger');
  return false;
}
function isFac(){ return sessionStorage.getItem('tcs.fac')==='1'; }
/* ---------- theme ---------- */
function applyTheme(){
  const t=db.settings.theme; const dark=t==='dark'||(t==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.documentElement.lang=db.settings.lang; document.documentElement.dir=db.settings.lang==='ar'?'rtl':'ltr';
}
/* ---------- router ---------- */
const routes={};
function route(name, fn){ routes[name]=fn; }
function go(hash){ if(location.hash==='#'+hash) window.TCS.render(); else location.hash=hash; }
function render(){
  const h=(location.hash||'#home').slice(1); const [name,...args]=h.split('/');
  const fn=routes[name]||routes.home; const main=document.getElementById('main');
  if(window.TCS_UI&&TCS_UI.beforeRoute) TCS_UI.beforeRoute(name);
  main.innerHTML=''; Promise.resolve(fn(main,...args.map(decodeURIComponent))).then(()=>{
    const h1=main.querySelector('h1'); if(h1){ h1.setAttribute('tabindex','-1'); h1.focus({preventScroll:false}); document.title=h1.textContent+' · TCS-Sim'; }
    document.querySelectorAll('[data-nav]').forEach(a=>a.setAttribute('aria-current', a.dataset.nav===name?'page':'false'));
  });
}
window.addEventListener('hashchange', ()=>window.TCS.render());
window.TCS={KEY,DEFAULT_SETTINGS,load,save,get db(){return db;},set db(v){db=v;},blank,generateRoster,importRosterCSV,parseCSV,toCSV,download,seededShuffle,hash,uid,esc,L,lang,bi,fmtTime,fmtDate,num,mean,sd,scenarios,scenario,module,teamOf,team,prog,announce,toast,dialog,confirmDlg,pinDlg,isFac,applyTheme,route,go,render,pad};
})();
