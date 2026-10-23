/* Facilitator Console part 1: overview, students (list + profile), teams. */
(function(){
'use strict';
const T=window.TCS, E=window.TCS_ENGINE, C=window.TCS_CHARTS, U=window.TCS_UI, F=window.TCS_FAC, K=window.TCS_CON, L=(a,e)=>T.L(a,e), esc=T.esc;
const kpi=(v,l,cls)=>'<div class="card pad-sm kpi'+(cls?' '+cls:'')+'"><b>'+v+'</b><span>'+l+'</span></div>';
const pct=(a,b)=>b?Math.round(100*a/b)+'%':'—';
const ago=iso=>{ if(!iso) return '—'; const m=Math.round((Date.now()-new Date(iso))/60000); return m<1?L('الآن','now'):m<60?m+L(' د',' min'):m<1440?Math.round(m/60)+L(' س',' h'):Math.round(m/1440)+L(' يوم',' d'); };
K.ago=ago; K.kpi=kpi;
const MODS=()=>window.TCS_MODULES||[];
const cloudBanner=()=>K.cloud()?'':'<div class="alert info small local-banner" role="note">💻 '+L('الوضع المحلي: تُحفظ إجراءات الإدارة على هذا الجهاز فقط (لا توجد حسابات حقيقية). سجّل الدخول بحساب ميسّر لتطبيقها على البيئة الحية.','Local mode: admin actions are stored on this device only (no real accounts). Sign in with a facilitator account to apply them to the live environment.')+'</div>';
K.cloudBanner=cloudBanner;
/* ---------- OVERVIEW ---------- */
F.overview=panel=>{
  const R=T.db.roster, st=R.students, all=st.map(s=>K.studentStats(s.code));
  const now=Date.now(), prof=Object.values(K.store().profiles);
  const activeNow=K.cloud()?prof.filter(p=>p.last_seen_at&&now-new Date(p.last_seen_at)<10*60000).length:T.db.sessions.filter(s=>s.status==='running').reduce((a,s)=>a+s.members.length,0);
  const running=T.db.sessions.filter(s=>['running','paused'].includes(s.status));
  const by=k=>all.filter(x=>x.status===k).length;
  const env=K.env();
  const done=(team,cy)=>T.db.sessions.some(s=>s.team===team&&s.cycle===cy&&s.mode==='research'&&['done','extras','measure'].includes(s.status));
  const alerts=[];
  all.filter(x=>x.status==='at_risk').slice(0,8).forEach(x=>alerts.push(['danger','⚠ '+x.code+' — '+(x.warn?L('إنذار عدم انخراط في المحاكاة','disengagement warning in simulation'):x.qAvg!=null&&x.qAvg<50?L('متوسط الاختبارات أقل من 50%','quiz average below 50%'):L('لا نشاط منذ أكثر من 10 أيام','no activity for over 10 days')),'#fac/students/'+x.code]));
  running.forEach(s=>{ const ew=E.Analytics.earlyWarnings(s); if(ew.length) alerts.push(['warn','🟠 '+s.team+' · '+s.scenario+': '+ew.length+L(' إنذار مبكر',' early warning(s)'),'#fac/live/'+s.id]); });
  if(prof.some(p=>p.disabled)) alerts.push(['info','🔒 '+prof.filter(p=>p.disabled).length+L(' حساب معطّل',' disabled account(s)'),'#fac/students']);
  const feed=[];
  T.db.sessions.forEach(s=>{ feed.push({at:s.createdAt,txt:s.team+' '+L('بدأ','started')+' '+s.scenario+' (C'+s.cycle+')',href:'#fac/live/'+s.id,ic:'🩺'}); if(s.endedAt) feed.push({at:s.endedAt,txt:s.team+' '+L('أنهى','finished')+' '+s.scenario,href:'#fac/analytics/'+s.id,ic:'🏁'}); });
  Object.entries(T.db.progress).forEach(([c,p])=>{ Object.entries(p.modules||{}).forEach(([m,v])=>v.at&&feed.push({at:v.at,txt:c+' '+(v.done?L('أكمل','completed'):L('فتح','opened'))+' '+m,href:'#fac/students/'+c,ic:'📘'})); Object.entries(p.quiz||{}).forEach(([m,v])=>v.at&&feed.push({at:v.at,txt:c+' '+L('اختبار','quiz')+' '+m+': '+v.last+'%',href:'#fac/students/'+c,ic:'📝'})); });
  T.db.obs.forEach(o=>feed.push({at:o.ts,txt:L('ملاحظة الأداة 2: ','Tool 2 observation: ')+o.student+' ('+o.phase+')',href:'#fac/students/'+o.student,ic:'👁'}));
  feed.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
  const modRate=MODS().map(m=>({label:m.id,values:[st.length?Math.round(100*st.filter(s=>{ const p=T.db.progress[s.code]; return p&&p.modules&&p.modules[m.id]&&p.modules[m.id].done; }).length/st.length):0]}));
  const scRate=T.scenarios().filter(s=>!s.custom).map(sc=>({label:sc.id,values:[1,2].map(cy=>T.db.sessions.filter(s=>s.scenario===sc.id&&s.cycle===cy&&['done','extras','measure'].includes(s.status)).length)}));
  panel.innerHTML=cloudBanner()+
  '<div class="row" style="margin-bottom:var(--s3)"><span class="badge pri">'+L('الدورة الحالية: ','Current cycle: ')+env.currentCycle+'</span><span class="badge '+(env.mode==='research'?'warn':'info')+'">'+(env.mode==='research'?L('وضع البحث','Research mode'):L('وضع التدريب','Practice mode'))+'</span><span class="spacer"></span><button class="btn btn-sm btn-secondary" id="ovRef">⟳ '+L('تحديث','Refresh')+'</button></div>'+
  '<div class="grid g4">'+kpi(activeNow,L('نشطون الآن (10 د)','active now (10 min)'))+kpi(running.length,L('جلسات جارية','running sessions'))+kpi(st.length,L('طلبة','students'))+kpi(Math.round(T.mean(all.map(x=>x.engage))||0)+'%',L('متوسط مؤشر الانخراط','mean engagement index'))+
  kpi(by('completed'),L('مكتمل','completed'))+kpi(by('in_progress'),L('قيد التقدم','in progress'))+kpi(by('not_started'),L('لم يبدأ','not started'))+kpi(by('at_risk'),L('معرّض للخطر','at risk'),by('at_risk')?'kpi-alert':'')+
  kpi(R.teams.filter(t=>done(t.code,1)).length+'/'+R.teams.length,L('فرق أكملت الدورة 1','teams completed Cycle 1'))+kpi(R.teams.filter(t=>done(t.code,2)).length+'/'+R.teams.length,L('فرق أكملت الدورة 2','teams completed Cycle 2'))+kpi(T.db.obs.length,L('ملاحظات الأداة 2','Tool 2 observations'))+kpi(pct(all.reduce((a,x)=>a+x.mDone,0),st.length*MODS().length),L('إنجاز الوحدات','module completion'))+'</div>'+
  '<div class="grid g2" style="margin-top:var(--s4)"><section class="card" aria-labelledby="alH"><h3 id="alH">🔔 '+L('تنبيهات','Alerts')+' ('+alerts.length+')</h3>'+(alerts.length?'<ul class="plain-list">'+alerts.map(a=>'<li><a class="alert '+a[0]+' small" style="display:block;margin:4px 0" href="'+a[2]+'">'+esc(a[1])+'</a></li>').join('')+'</ul>':'<p class="muted small">'+L('لا توجد تنبيهات.','No alerts.')+'</p>')+'</section>'+
  '<section class="card" aria-labelledby="fdH"><h3 id="fdH">📡 '+L('موجز النشاط المباشر','Live activity feed')+'</h3><ol class="feed" tabindex="0" aria-live="polite">'+(feed.slice(0,14).map(f=>'<li><span aria-hidden="true">'+f.ic+'</span> <a href="'+f.href+'">'+esc(f.txt)+'</a> <span class="xs muted">'+ago(f.at)+'</span></li>').join('')||'<li class="muted small">'+L('لا نشاط بعد.','No activity yet.')+'</li>')+'</ol></section></div>'+
  '<div class="grid g2" style="margin-top:var(--s4)"><section class="card"><h3>'+L('إنجاز الوحدات (% من الدفعة)','Module completion (% of cohort)')+'</h3>'+C.bars(modRate,['%'],{max:100,label:L('إنجاز الوحدات','Module completion')})+'</section>'+
  '<section class="card"><h3>'+L('جلسات مكتملة لكل سيناريو ودورة','Completed sessions per scenario & cycle')+'</h3>'+C.bars(scRate,[L('الدورة 1','Cycle 1'),L('الدورة 2','Cycle 2')],{label:L('الجلسات','Sessions')})+'</section></div>';
  panel.querySelector('#ovRef').onclick=async()=>{ if(window.TCS_CLOUD&&TCS_CLOUD.enabled) await TCS_CLOUD.sync({pull:true}); T.render(); };
  U.setTicker&&U.setTicker(()=>{ if(!document.getElementById('ovRef')) return U.stopTicker(); });
};
/* ---------- STUDENTS LIST ---------- */
F.students=(panel,arg)=>{ if(arg) return F.student(panel,arg);
  const R=T.db.roster; const st0=JSON.parse(sessionStorage.getItem('tcs.stuF')||'{}');
  panel.innerHTML=cloudBanner()+'<form class="row filters" id="sfF" role="search" aria-label="'+L('تصفية الطلبة','Filter students')+'" style="margin-bottom:var(--s3)">'+
   '<label class="fld" style="margin:0;flex:1;min-width:180px"><span>'+L('بحث','Search')+'</span><input name="q" class="ltr" value="'+esc(st0.q||'')+'" placeholder="S07, T03…"></label>'+
   '<label class="fld" style="margin:0"><span>'+L('الحالة','Status')+'</span><select name="s"><option value="">'+L('الكل','All')+'</option>'+Object.keys(K.STATUS).map(k=>'<option value="'+k+'"'+(st0.s===k?' selected':'')+'>'+(T.lang()==='ar'?K.STATUS[k][1][0]:K.STATUS[k][1][1])+'</option>').join('')+'<option value="disabled"'+(st0.s==='disabled'?' selected':'')+'>'+L('معطّل','Disabled')+'</option></select></label>'+
   '<label class="fld" style="margin:0"><span>'+L('الفريق','Team')+'</span><select name="t"><option value="">'+L('الكل','All')+'</option>'+R.teams.map(t=>'<option'+(st0.t===t.code?' selected':'')+'>'+t.code+'</option>').join('')+'</select></label>'+
   '<label class="fld" style="margin:0"><span>'+L('ترتيب','Sort')+'</span><select name="o">'+[['code',L('الرمز','Code')],['engage',L('الانخراط','Engagement')],['quiz',L('الاختبارات','Quizzes')],['last',L('آخر نشاط','Last active')]].map(o=>'<option value="'+o[0]+'"'+(st0.o===o[0]?' selected':'')+'>'+o[1]+'</option>').join('')+'</select></label>'+
   '<button type="button" class="btn btn-sm btn-ghost" id="sfX">'+L('تصدير CSV','Export CSV')+'</button></form><p id="sfN" class="small muted" aria-live="polite"></p><div class="tbl-wrap" tabindex="0" id="sfT"></div>';
  const f=panel.querySelector('#sfF'); let rows=[];
  const draw=()=>{ const v={q:f.q.value.trim().toUpperCase(),s:f.s.value,t:f.t.value,o:f.o.value}; sessionStorage.setItem('tcs.stuF',JSON.stringify(v));
    rows=R.students.map(s=>Object.assign(K.studentStats(s.code),{team:s.team,consent:s.consent!==false})).filter(x=>(!v.q||x.code.includes(v.q)||String(x.team).includes(v.q))&&(!v.t||x.team===v.t)&&(!v.s||(v.s==='disabled'?x.disabled:x.status===v.s)));
    const o=v.o; rows.sort((a,b)=>o==='engage'?b.engage-a.engage:o==='quiz'?(b.qAvg||-1)-(a.qAvg||-1):o==='last'?String(b.last||'').localeCompare(String(a.last||'')):a.code.localeCompare(b.code));
    panel.querySelector('#sfN').textContent=rows.length+' / '+R.students.length+L(' طالب',' students');
    panel.querySelector('#sfT').innerHTML='<table class="tbl"><caption class="sr-only">'+L('قائمة الطلبة','Student list')+'</caption><thead><tr><th scope="col">'+L('الطالب','Student')+'</th><th scope="col">'+L('الفريق','Team')+'</th><th scope="col">'+L('الحالة','Status')+'</th><th scope="col" class="num">'+L('الوحدات','Modules')+'</th><th scope="col" class="num">'+L('الاختبارات','Quiz avg')+'</th><th scope="col" class="num">'+L('الجلسات','Sessions')+'</th><th scope="col" class="num">'+L('الانخراط','Engagement')+'</th><th scope="col">'+L('آخر نشاط','Last active')+'</th><th scope="col">'+L('الموافقة','Consent')+'</th></tr></thead><tbody>'+
     rows.map(x=>'<tr><th scope="row"><a class="mono" href="#fac/students/'+x.code+'">'+x.code+'</a>'+(x.disabled?' <span class="badge danger">🔒 '+L('معطّل','disabled')+'</span>':'')+'</th><td class="mono">'+esc(x.team||'—')+'</td><td>'+K.badge(x.status)+'</td><td class="num">'+x.mDone+'/'+x.mTotal+'</td><td class="num">'+(x.qAvg==null?'—':Math.round(x.qAvg)+'%')+'</td><td class="num">'+x.sesDone.length+'</td><td class="num"><div class="bar" role="img" aria-label="'+x.engage+'%"><i style="width:'+x.engage+'%"></i></div> '+x.engage+'</td><td class="small">'+ago(x.last)+'</td><td>'+(x.consent?'✓':'✗')+'</td></tr>').join('')+'</tbody></table>'; };
  f.oninput=draw; f.onchange=draw; f.onsubmit=e=>e.preventDefault(); draw();
  panel.querySelector('#sfX').onclick=()=>T.download('students-'+new Date().toISOString().slice(0,10)+'.csv',T.toCSV([['code','team','status','modules_done','quiz_avg','sessions_done','engagement','last_active','consent','disabled']].concat(rows.map(x=>[x.code,x.team,x.status,x.mDone,x.qAvg==null?'':Math.round(x.qAvg),x.sesDone.length,x.engage,x.last||'',x.consent?1:0,x.disabled?1:0]))),'text/csv');
};
})();
