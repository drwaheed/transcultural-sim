/* Applies facilitator environment controls on student-facing screens: announcements, schedule, cycle/mode defaults, module & scenario locks, feature toggles. */
(function(){
'use strict';
const T=window.TCS, K=window.TCS_CON, L=(a,e)=>T.L(a,e), esc=T.esc;
const isFac=()=>T.isFac();
const myTeam=()=>{ const C=window.TCS_CLOUD; if(C&&C.profile&&C.profile.team_code) return C.profile.team_code; const c=sessionStorage.getItem('tcs.stu'); const s=c&&T.db.roster.students.find(x=>x.code===c); return s?s.team:sessionStorage.getItem('tcs.lastTeam'); };
K.activeAnnouncements=()=>{ const now=new Date(), t=myTeam(); return K.store().announcements.filter(a=>(a.audience==='all'||a.audience===t||isFac())&&new Date(a.starts_at||0)<=now&&(!a.ends_at||new Date(a.ends_at)>now)); };
K.mySchedule=()=>{ const t=myTeam(), now=Date.now(); return K.store().schedules.filter(x=>(!t||x.team_code===t)&&new Date(x.ends_at||x.starts_at).getTime()>now-36e5).sort((a,b)=>String(a.starts_at).localeCompare(String(b.starts_at))).slice(0,4); };
function banner(){ const an=K.activeAnnouncements(), sc=myTeam()?K.mySchedule():[]; if(!an.length&&!sc.length) return '';
  return '<section class="ann-bar" aria-label="'+L('إعلانات ومواعيد','Announcements and schedule')+'">'+an.map(a=>'<div class="alert '+(a.level==='urgent'?'danger':a.level==='warn'?'warn':'info')+'" role="'+(a.level==='urgent'?'alert':'note')+'"><b>📣 '+esc(a.title)+'</b>'+(a.body?'<p style="margin:4px 0 0" class="small">'+esc(a.body)+'</p>':'')+'</div>').join('')+
   (sc.length?'<div class="alert info"><b>🗓 '+L('جلسات فريقك القادمة','Your team’s upcoming sessions')+'</b><ul class="small" style="margin:4px 0 0">'+sc.map(x=>'<li>'+T.fmtDate(x.starts_at)+' — '+(x.cycle?L('الدورة ','Cycle ')+x.cycle:L('تدريب','Practice'))+(x.scenario?' · '+esc(x.scenario):'')+(x.location?' · '+esc(x.location):'')+'</li>').join('')+'</ul></div>':'')+'</section>'; }
function lockedView(main,id){ main.innerHTML='<h1>🔒 '+L('المحتوى مقفل حالياً','Content currently locked')+'</h1><div class="card"><p>'+L('قام الميسّر بقفل ','The facilitator has locked ')+'<b class="mono">'+esc(id)+'</b>'+L(' في الدورة الحالية. سيُفتح عندما يحين موعده.',' for the current cycle. It will open when scheduled.')+'</p><a class="btn btn-primary" href="#modules">'+L('العودة إلى الوحدات','Back to modules')+'</a></div>'; }
const render0=T.render;
T.render=function(){ const main=document.getElementById('main'); const parts=(location.hash||'#home').slice(1).split('/'), h=parts[0], env=K.env(), fac=isFac();
  if(!fac&&main&&(h==='mod'||h==='quiz')&&parts[1]&&K.locked('module',parts[1].toUpperCase())){ render0.apply(T,arguments); if(document.querySelector('#lf,#pf')) return; lockedView(main,parts[1].toUpperCase()); return; }
  if(!fac&&h==='help'&&parts[1]==='tutor'&&env.features.tutor===false){ location.replace('#help/guide'); return; }
  render0.apply(T,arguments);
  if(!main||document.querySelector('#lf,#pf')) return;
  if(h==='home'||h==='hub'||h===''){ const b=banner(); if(b) main.insertAdjacentHTML('afterbegin',b); }
  if(h==='help'&&env.features.tutor===false){ const t=main.querySelector('#ht-tutor'); if(t) t.remove(); }
  if(h==='modules'&&!fac) main.querySelectorAll('.mod-card').forEach(c=>{ const a=c.querySelector('h2 a'); const m=a&&(a.getAttribute('href')||'').match(/#mod\/(M\d)/); if(m&&K.locked('module',m[1])){ c.classList.add('lockcard'); a.insertAdjacentHTML('beforebegin','<span class="badge warn">🔒 '+L('مقفل','Locked')+'</span> '); } });
  if(h==='hub'&&env.features.badges===false) main.querySelectorAll('[data-badges],.badges').forEach(x=>x.hidden=true);
  if(h==='start'){ const f=main.querySelector('#startForm'); if(!f) return;
    const cy=f.querySelector('input[name=cycle][value="'+env.currentCycle+'"]'); if(cy&&!cy.checked){ cy.checked=true; cy.dispatchEvent(new Event('change',{bubbles:true})); }
    const md=f.querySelector('input[name=mode][value="'+env.mode+'"]'); if(md&&!md.checked){ md.checked=true; md.dispatchEvent(new Event('change',{bubbles:true})); }
    if(!fac&&env.mode==='research'){ const p=f.querySelector('input[name=mode][value=practice]'); if(p){ p.disabled=true; p.closest('label').insertAdjacentHTML('beforeend','<span class="xs muted"> 🔒 '+L('وضع البحث مفروض من الميسّر','Research mode set by facilitator')+'</span>'); } }
    if(!fac){ const sel=f.querySelector('#scSel'); const apply=()=>{ [...sel.options].forEach(o=>{ const lk=K.locked('scenario',o.value); o.disabled=lk; if(lk&&!/🔒/.test(o.textContent)) o.textContent+=' 🔒'; }); if(sel.selectedOptions[0]&&sel.selectedOptions[0].disabled){ const ok=[...sel.options].find(o=>!o.disabled); if(ok) sel.value=ok.value; } };
      if(sel){ apply(); f.addEventListener('change',()=>setTimeout(apply,0)); }
      f.addEventListener('submit',e=>{ if(sel&&K.locked('scenario',sel.value)){ e.preventDefault(); e.stopImmediatePropagation(); T.toast(L('هذا السيناريو مقفل حالياً.','This scenario is currently locked.'),'danger'); } },true); } }
};
})();
