/* UI part 1: app shell, home, team start, prebriefing, simulation screen. */
(function(){
'use strict';
const T=window.TCS, E=window.TCS_ENGINE, C=window.TCS_CHARTS, L=(a,e)=>T.L(a,e), esc=T.esc;
const ROLES=[
 {id:'lead',ar:'قائد التواصل',en:'Communication lead',d:{ar:'يدير الحوار مع المريض والأسرة',en:'Leads the conversation with the patient/family'}},
 {id:'assessor',ar:'المقيّم',en:'Assessor',d:{ar:'يجمع بيانات التقييم ويطرح أسئلة المتابعة',en:'Gathers assessment data and asks follow-up questions'}},
 {id:'documenter',ar:'الموثّق',en:'Documenter',d:{ar:'يكتب تبريرات القرارات وملاحظة SBAR',en:'Types decision rationales and the SBAR note'}},
 {id:'broker',ar:'الوسيط الثقافي',en:'Cultural broker',d:{ar:'يرصد الإشارات الثقافية ومجالات Giger',en:'Watches cultural cues and Giger domains'}},
 {id:'support',ar:'عضو داعم (ضابط الوقت)',en:'Co-assessor & timekeeper',d:{ar:'يدعم المقيّم ويتابع الوقت ونقاط القرار',en:'Supports the assessor; tracks time and decision points'}}
];
const roleName=id=>{ const r=ROLES.find(x=>x.id===id); return r?(T.lang()==='ar'?r.ar:r.en):id; };
function cur(id){ return T.db.sessions.find(s=>s.id===id); }
function persist(){ T.save(); }
function avatar(p){ return '<span class="av" style="background:'+p.color+'" aria-hidden="true">'+esc(p.avatar)+'</span>'; }
let ticker=null; function stopTicker(){ if(ticker){ clearInterval(ticker); ticker=null; } }
/* ---------------- shell ---------------- */
function shell(){
  const s=T.db.settings;
  document.getElementById('app').innerHTML=
  '<a class="skip" href="#main" onclick="event.preventDefault();document.getElementById(\'main\').focus()">'+L('تخطَّ إلى المحتوى','Skip to content')+'</a>'+
  '<header class="appbar no-print"><div class="appbar-in">'+
   '<a class="brand" href="#home"><span class="brand-mark" aria-hidden="true">✚</span><span>TCS-Sim<small>'+L('المحاكاة السريرية عبر الثقافية · NUR416','Transcultural Clinical Simulation · NUR416')+'</small></span></a>'+
   '<button class="icon-btn menu-btn" aria-expanded="false" aria-controls="nav" aria-label="'+L('القائمة','Menu')+'" id="menuBtn">☰</button>'+
   '<nav class="nav" id="nav" aria-label="'+L('التنقل الرئيسي','Main navigation')+'">'+
    '<a href="#home" data-nav="home">'+L('الرئيسية','Home')+'</a>'+
    '<a href="#start" data-nav="start">'+L('بدء محاكاة','Start simulation')+'</a>'+
    '<a href="#hub" data-nav="hub">'+L('بوابة الطالب','Student hub')+'</a>'+
    '<a href="#modules" data-nav="modules">'+L('الوحدات التعليمية','Learning modules')+'</a>'+
    '<a href="#fac" data-nav="fac">'+L('لوحة الميسّر','Facilitator')+'</a>'+
    '<a href="#help" data-nav="help">'+L('المساعدة','Help')+'</a>'+
   '</nav>'+
   '<div class="tools">'+
    '<a class="icon-btn" href="#search" aria-label="'+L('البحث الذكي','Smart search')+'" title="'+L('البحث الذكي','Smart search')+'">🔍</a>'+
    '<button class="icon-btn" id="themeBtn" aria-label="'+L('تبديل الوضع الليلي/النهاري','Toggle dark/light mode')+'" title="'+L('الوضع','Theme')+'">'+(document.documentElement.dataset.theme==='dark'?'☀️':'🌙')+'</button>'+
    '<button class="btn btn-sm btn-secondary" id="langBtn" lang="'+(s.lang==='ar'?'en':'ar')+'" aria-label="'+(s.lang==='ar'?'EN — Switch to English':'عربي — التبديل إلى العربية')+'">'+(s.lang==='ar'?'EN':'عربي')+'</button>'+
   '</div></div></header>'+
  '<main id="main" tabindex="-1"></main>'+
  '<footer class="foot no-print">'+L('جميع الشخصيات خيالية · لا تُدخل أي بيانات تعريفية · البيانات تُحفظ محلياً في هذا المتصفح فقط','All characters are fictional · Do not enter identifying data · Data is stored locally in this browser only')+' · v1.0</footer>'+
  '<div id="toasts" aria-live="polite"></div><div id="sr-live" class="sr-only" aria-live="assertive"></div>';
  document.getElementById('langBtn').onclick=()=>{ s.lang=s.lang==='ar'?'en':'ar'; T.save(true); T.applyTheme(); shell(); T.render(); };
  document.getElementById('themeBtn').onclick=()=>{ const d=document.documentElement.dataset.theme==='dark'; s.theme=d?'light':'dark'; T.save(true); T.applyTheme(); shell(); T.render(); };
  const mb=document.getElementById('menuBtn'), nav=document.getElementById('nav'); mb.onclick=()=>{ const o=nav.classList.toggle('open'); mb.setAttribute('aria-expanded',o); };
  nav.addEventListener('click',e=>{ if(e.target.tagName==='A'){ nav.classList.remove('open'); mb.setAttribute('aria-expanded','false'); } });
}
window.TCS_UI={shell, ROLES, roleName, cur, beforeRoute(){ stopTicker(); if(window.speechSynthesis) speechSynthesis.cancel(); }};
/* ---------------- home ---------------- */
T.route('home', main=>{
  const n=T.db.sessions.length, done=T.db.sessions.filter(s=>['done','measure','extras'].includes(s.status)).length;
  main.innerHTML=
  '<section class="hero"><span class="eyebrow">🎓 '+L('جامعة البحرين · كلية العلوم الصحية والرياضية','University of Bahrain · College of Health & Sport Sciences')+'</span>'+
  '<h1>'+L('بيئة تعلّم ذكية بالمحاكاة السريرية عبر الثقافية','Agentic AI Transcultural Clinical Simulation')+'</h1>'+
  '<p class="lead">'+L('مرضى وأسر افتراضيون متنوعون ثقافياً، ونقاط قرار، واستخلاص PEARLS، ولوحة ميسّر لقياس الانخراط السلوكي والمعرفي والانفعالي لطلبة السنة الرابعة.','Culturally diverse virtual patients and families, decision points, PEARLS debriefing and a facilitator dashboard to measure behavioural, cognitive and emotional engagement of 4th-year students.')+'</p>'+
  '<div class="btn-row"><a class="btn btn-primary btn-lg" href="#start" id="ctaStart">▶ '+L('بدء جلسة فريق','Start a team session')+'</a><a class="btn btn-secondary btn-lg" href="#hub">📚 '+L('بوابة الطالب','Student hub')+'</a><button class="btn btn-ghost btn-lg" id="tourBtn">🧭 '+L('جولة تعريفية','Take the tour')+'</button></div></section>'+
  '<div class="grid g4" id="homeCards">'+
   card('#start','🩺',L('محاكاة الفريق','Team simulation'),L('دخول برمز الفريق، اختيار الدورة، تهيئة، محاكاة بأربع نقاط قرار.','Sign in with a team code, choose the cycle, prebrief, and simulate with 4 decision points.'))+
   card('#modules','🗂️',L('الوحدات التعليمية M1–M8','Learning modules M1–M8'),L('كل محتوى العروض الثمانية مع صور الشرائح والملاحظات والاختبارات.','All content of the 8 lectures with slide images, notes and quizzes.'))+
   card('#fac','📊',L('لوحة الميسّر','Facilitator dashboard'),L('متابعة حية، دفعة من 80 طالباً، الأداة 2، التحليلات، التصدير.','Live monitoring, 80-student cohort, Tool 2, analytics, export.'))+
   card('#help','❓',L('الدليل والمساعد','Guide & tutor'),L('دليل عربي لتشغيل الجلسات، وتفعيل وضع النموذج اللغوي، ومساعد تعليمي.','Arabic guide to running sessions, enabling LLM mode, and a tutor.'))+
  '</div>'+
  '<section class="grid g3" style="margin-top:var(--s5)">'+
   '<div class="card"><h2 class="h3">'+L('حالة هذا الجهاز','This device')+'</h2><dl class="kv"><dt>'+L('محرك الوكلاء','Agent engine')+'</dt><dd>'+(T.db.settings.engine==='llm'&&T.db.settings.apiKey?'LLM · <span class="ltr">'+esc(T.db.settings.model)+'</span>':L('دون اتصال (قواعد مدمجة)','Offline (built-in rules)'))+'</dd><dt>'+L('الدفعة','Cohort')+'</dt><dd>'+T.db.roster.students.length+' '+L('طالباً','students')+' · '+T.db.roster.teams.length+' '+L('فريقاً','teams')+'</dd><dt>'+L('الجلسات','Sessions')+'</dt><dd>'+n+' ('+done+' '+L('مكتملة','completed')+')</dd><dt>'+L('رمز الجهاز','Device code')+'</dt><dd class="mono">'+esc(T.db.meta.device)+'</dd></dl></div>'+
   '<div class="card"><h2 class="h3">'+L('تكافؤ الدورتين','Equal conditions')+'</h2><p class="small">'+L('في وضع البحث تُثبَّت السيناريوهات (S2 للدورة 1 وS5 للدورة 2 افتراضياً) والمدة ونقاط القرار والوكلاء وبنك التلميحات؛ الفرق الوحيد هو استخلاص PEARLS في الدورة 2. التكيّف الذكي متاح في وضع التدريب فقط.','In research mode, scenarios (S2 for Cycle 1 and S5 for Cycle 2 by default), duration, decision points, agents and hint bank are fixed; the only difference is the PEARLS debrief in Cycle 2. Adaptive features run in practice mode only.')+'</p></div>'+
   '<div class="card"><h2 class="h3">'+L('الخصوصية','Privacy')+'</h2><p class="small">'+L('رموز مجهّلة فقط (S01–S80 وT01–T16). لا تُرسل أي بيانات إلى أي خادم في الوضع دون اتصال. في وضع النموذج اللغوي تُرسل نصوص الحوار فقط إلى نقطة الاتصال التي يحددها الميسّر.','Anonymised codes only (S01–S80, T01–T16). Nothing leaves this browser in offline mode. In LLM mode only dialogue text is sent to the endpoint the facilitator configures.')+'</p></div>'+
  '</section>';
  document.getElementById('tourBtn').onclick=()=>window.TCS_TOUR&&TCS_TOUR.start();
  if(T.db.settings.showTourOnStart&&!localStorage.getItem('tcs.tourSeen')) setTimeout(()=>window.TCS_TOUR&&TCS_TOUR.start(),400);
});
function card(href,icon,title,text){ return '<a class="card card-link" href="'+href+'"><div class="icon-tile" aria-hidden="true">'+icon+'</div><h2 class="h3" style="font-size:var(--fs-lg)">'+title+'</h2><p class="small muted">'+text+'</p></a>'; }
/* ---------------- start (team login) ---------------- */
T.route('start', main=>{
  const s=T.db.settings, teams=T.db.roster.teams;
  if(!teams.length){ main.innerHTML='<h1>'+L('بدء محاكاة','Start simulation')+'</h1><div class="empty"><span class="big">👥</span>'+L('لا توجد فرق بعد. اطلب من الميسّر إنشاء قائمة الدفعة.','No teams yet. Ask the facilitator to create the cohort roster.')+'<div style="margin-top:12px"><a class="btn btn-primary" href="#fac/roster">'+L('إنشاء القائمة','Create roster')+'</a></div></div>'; return; }
  const scOpts=T.scenarios().map(sc=>'<option value="'+sc.id+'">'+esc(sc.id+' · '+T.bi(sc.title)+(sc.custom?' ('+L('مخصص','custom')+')':''))+'</option>').join('');
  main.innerHTML='<h1>'+L('بدء جلسة محاكاة للفريق','Start a team simulation session')+'</h1>'+
  '<ol class="stepper" aria-label="'+L('مراحل الجلسة','Session steps')+'"><li aria-current="step"><span class="dot">1</span>'+L('الدخول','Sign in')+'</li><li><span class="dot">2</span>'+L('التهيئة','Prebrief')+'</li><li><span class="dot">3</span>'+L('المحاكاة','Simulation')+'</li><li><span class="dot">4</span>'+L('الاختتام','Debrief')+'</li><li><span class="dot">5</span>'+L('القياس','Measurement')+'</li></ol>'+
  '<form class="grid g2" id="startForm" novalidate>'+
   '<div class="card"><h2>'+L('الفريق والحضور','Team & attendance')+'</h2>'+
    '<label class="fld"><span>'+L('رمز الفريق','Team code')+'</span><input id="teamCode" list="teamList" autocomplete="off" required aria-describedby="teamHint" placeholder="T01" class="ltr"><datalist id="teamList">'+teams.map(t=>'<option value="'+t.code+'">').join('')+'</datalist><span class="hint" id="teamHint">'+L('اكتب رمز فريقك كما في نظام إدارة التعلم (مثل T01).','Enter your team code from the LMS (e.g., T01).')+'</span><span class="err" id="teamErr" role="alert"></span></label>'+
    '<fieldset id="members" class="fld"><legend>'+L('الأعضاء الحاضرون','Members present')+'</legend><p class="muted small">'+L('أدخل رمز الفريق لعرض الأعضاء.','Enter the team code to list members.')+'</p></fieldset>'+
   '</div>'+
   '<div class="card"><h2>'+L('الدورة والوضع','Cycle & mode')+'</h2>'+
    '<fieldset class="fld"><legend>'+L('الوضع','Mode')+'</legend>'+
     '<label class="choice"><input type="radio" name="mode" value="research" checked><span><b>'+L('بحث (شروط متكافئة)','Research (equal conditions)')+'</b><br><span class="small muted">'+L('سيناريو ثابت لكل دورة، لا تكيّف، تلميحات من البنك فقط.','Fixed scenario per cycle, no adaptivity, hints from the bank only.')+'</span></span></label>'+
     '<label class="choice"><input type="radio" name="mode" value="practice"><span><b>'+L('تدريب حر','Practice (free exploration)')+'</b><br><span class="small muted">'+L('أي سيناريو، تكيّف ذكي للصعوبة، تحدٍّ إضافي، تلميحات موجّهة.','Any scenario, adaptive difficulty, extra challenge, targeted hints.')+'</span></span></label></fieldset>'+
    '<fieldset class="fld"><legend>'+L('الدورة','Cycle')+'</legend>'+
     '<label class="choice"><input type="radio" name="cycle" value="1" checked><span><b>'+L('الدورة 1','Cycle 1')+'</b> — '+L('محاكاة + ملخص قصير من المدرّس','simulation + brief instructor summary')+'</span></label>'+
     '<label class="choice"><input type="radio" name="cycle" value="2"><span><b>'+L('الدورة 2','Cycle 2')+'</b> — '+L('محاكاة + استخلاص PEARLS منظم','simulation + structured PEARLS debrief')+'</span></label></fieldset>'+
    '<label class="fld"><span>'+L('السيناريو','Scenario')+'</span><select id="scSel">'+scOpts+'</select><span class="hint" id="scHint"></span></label>'+
    '<div id="debriefPick" hidden><fieldset class="fld"><legend>'+L('نوع الاختتام (تدريب)','Closing type (practice)')+'</legend><div class="seg"><label><input type="radio" name="dbt" value="summary"><span>'+L('ملخص قصير','Brief summary')+'</span></label><label><input type="radio" name="dbt" value="pearls" checked><span>PEARLS</span></label></div></fieldset></div>'+
    '<div class="alert info small" role="note">ℹ️ '+L('لا تُستخدم سجلات المحاكاة في التقييم الختامي. لا تكتب أسماء حقيقية.','Simulation logs are not used for summative grading. Do not type real names.')+'</div>'+
    '<button class="btn btn-primary btn-lg" type="submit" style="width:100%">'+L('متابعة إلى التهيئة','Continue to prebriefing')+' ←</button>'+
   '</div></form>';
  const f=main.querySelector('#startForm'), sel=f.querySelector('#scSel'), hint=f.querySelector('#scHint');
  const upd=()=>{ const mode=f.mode.value, cyc=f.cycle.value; if(mode==='research'){ sel.value=cyc==='1'?s.researchScenarioC1:s.researchScenarioC2; sel.disabled=true; hint.textContent=L('مقفل في وضع البحث وفق الإعدادات (S2 للدورة 1 وS5 للدورة 2 افتراضياً).','Locked in research mode per settings (S2 for Cycle 1, S5 for Cycle 2 by default).'); } else { sel.disabled=false; hint.textContent=L('اختر أي سيناريو للتدريب.','Pick any scenario to practise.'); }
    f.querySelector('#debriefPick').hidden=mode!=='practice'; };
  f.addEventListener('change',upd); upd();
  const tc=f.querySelector('#teamCode');
  const showMembers=()=>{ const t=T.team(tc.value.trim().toUpperCase()); const fs=f.querySelector('#members'); if(!t){ fs.innerHTML='<legend>'+L('الأعضاء الحاضرون','Members present')+'</legend><p class="muted small">'+L('أدخل رمز الفريق لعرض الأعضاء.','Enter the team code to list members.')+'</p>'; return; }
    fs.innerHTML='<legend>'+L('الأعضاء الحاضرون','Members present')+' ('+t.members.length+')</legend>'+t.members.map(m=>'<label class="choice" style="padding:8px 12px"><input type="checkbox" name="mem" value="'+m+'" checked><span class="mono">'+m+'</span></label>').join(''); };
  tc.addEventListener('input',showMembers);
  if(sessionStorage.getItem('tcs.lastTeam')){ tc.value=sessionStorage.getItem('tcs.lastTeam'); showMembers(); }
  f.onsubmit=e=>{ e.preventDefault(); const code=tc.value.trim().toUpperCase(); const t=T.team(code); const err=f.querySelector('#teamErr');
    if(!t){ err.textContent=L('رمز فريق غير موجود في القائمة.','Team code not found in the roster.'); tc.setAttribute('aria-invalid','true'); tc.focus(); return; }
    err.textContent=''; tc.removeAttribute('aria-invalid');
    const members=[...f.querySelectorAll('input[name=mem]:checked')].map(i=>i.value); if(members.length<2){ err.textContent=L('اختر عضوين على الأقل.','Select at least two members.'); return; }
    const mode=f.mode.value, cycle=+f.cycle.value; const prev=T.db.sessions.filter(x=>x.team===code).length;
    const roles={}; members.forEach((m,i)=>roles[m]=ROLES[(i+cycle-1+prev)%Math.min(5,Math.max(4,members.length))].id);
    const S=E.Orchestrator.create({team:code,cycle,scenarioId:sel.value,mode,members,roles});
    S.debriefType=mode==='research'?(cycle===2?'pearls':'summary'):(f.dbt.value||'pearls');
    T.db.sessions.push(S); T.save(true); sessionStorage.setItem('tcs.lastTeam',code); T.go('prebrief/'+S.id); };
});
/* ---------------- prebriefing ---------------- */
T.route('prebrief',(main,id)=>{
  const S=cur(id); if(!S) return notFound(main); const sc=T.scenario(S.scenario);
  main.innerHTML='<h1>'+L('التهيئة (Prebriefing)','Prebriefing')+' · '+esc(sc.id)+'</h1>'+
  steps(2)+
  (sc.warning?'<div class="alert danger" role="alert"><b>⚠️</b><div>'+esc(T.bi(sc.warning))+'</div></div>':'')+
  '<div class="grid g2">'+
   '<div class="card"><h2>'+sc.icon+' '+esc(T.bi(sc.title))+'</h2><p>'+esc(T.bi(sc.setting))+'</p><h3>'+L('نواتج التعلم','Learning outcomes')+' <span class="badge pri">'+sc.lecture+'</span></h3><ul>'+sc.objectives.map(o=>'<li>'+esc(T.bi(o))+'</li>').join('')+'</ul>'+
    '<h3>'+L('الشخصيات','Characters')+'</h3><div class="persona-strip">'+sc.personas.map(p=>'<span class="pchip">'+avatar(p)+'<span><b>'+esc(p.name)+'</b><br><span class="xs muted">'+esc(T.bi(p.role))+'</span></span></span>').join('')+'</div></div>'+
   '<div class="card"><h2>'+L('الأدوار (بالتدوير)','Roles (rotating)')+'</h2><div class="tbl-wrap" tabindex="0"><table class="tbl"><thead><tr><th>'+L('الطالب','Student')+'</th><th>'+L('الدور','Role')+'</th><th>'+L('المهمة','Task')+'</th></tr></thead><tbody>'+S.members.map(m=>{ const r=ROLES.find(x=>x.id===S.roles[m]); return '<tr><td class="mono">'+m+'</td><td><label class="sr-only" for="r-'+m+'">'+L('دور','Role')+' '+m+'</label><select id="r-'+m+'" data-m="'+m+'">'+ROLES.map(x=>'<option value="'+x.id+'"'+(x.id===r.id?' selected':'')+'>'+(T.lang()==='ar'?x.ar:x.en)+'</option>').join('')+'</select></td><td class="small">'+esc(T.bi(r.d))+'</td></tr>'; }).join('')+'</tbody></table></div><p class="xs muted" style="margin-top:8px">'+L('يُدوَّر الدور تلقائياً بين الجلسات؛ يمكن للميسّر التعديل.','Roles rotate automatically between sessions; the facilitator may adjust.')+'</p></div>'+
  '</div>'+
  '<div class="grid g3" style="margin-top:var(--s4)">'+
   '<div class="card"><h3>🎭 '+L('العقد الخيالي','Fiction contract')+'</h3><p class="small">'+L('هذه محاكاة لموقف خيالي. سنتعامل معه بجدية كأنه حقيقي، مع احترام حدود المحاكاة. الافتراض الأساسي: الجميع أذكياء وأكفاء ويريدون التعلم.','This is a simulation of a fictional situation. We will treat it seriously as if real, respecting its limits. Basic assumption: everyone is intelligent, capable and wants to learn.')+'</p></div>'+
   '<div class="card"><h3>🤖 '+L('الإفصاح عن الذكاء الاصطناعي','AI disclosure')+'</h3><p class="small">'+L('ستتحدثون مع شخصيات افتراضية يولّدها الذكاء الاصطناعي (أو قواعد مدمجة). قد تخطئ أحياناً؛ الميسّر يشرف ويصحح. المحرك الحالي: ','You will talk with virtual characters generated by AI (or built-in rules). They may make mistakes; the facilitator supervises and corrects. Current engine: ')+'<b>'+(S.engine==='llm'?'LLM '+esc(S.model):L('قواعد مدمجة دون اتصال','offline built-in rules'))+'</b>.</p></div>'+
   '<div class="card"><h3>🛑 '+L('كلمة الأمان','Safety word')+'</h3><p class="small">'+L('يمكن لأي طالب كتابة','Any student can type')+' <span class="kbd ltr">pause simulation</span> '+L('أو الضغط على زر الإيقاف في أي وقت. تتوقف المحاكاة فوراً ويتدخل الميسّر.','or press the pause button at any time. The simulation stops immediately and the facilitator checks in.')+'</p></div>'+
  '</div>'+
  '<div class="card" style="margin-top:var(--s4)"><h3>⏱️ '+L('هيكل الجلسة','Session structure')+'</h3><ul class="small"><li>'+L('مدة المحاكاة: حتى ','Simulation: up to ')+T.db.settings.simMinutes+L(' دقيقة، مع 4 نقاط قرار بالضبط تتطلب اختياراً وتبريراً.',' minutes, with exactly 4 decision points requiring a choice and a rationale.')+'</li><li>'+L('تلميح محايد بعد ','A neutral hint after ')+Math.round(E.hintRules(S).silence/60*10)/10+L(' دقيقة من الصمت (حد أقصى ',' min of silence (max ')+E.hintRules(S).max+').</li><li>'+(S.debriefType==='pearls'?L('سيعقب المحاكاة استخلاص منظم وفق نموذج PEARLS (25–30 دقيقة).','The simulation will be followed by a structured PEARLS debrief (25–30 min).'):L('تُختتم المحاكاة بملخص قصير من المدرّس (≈5 دقائق).','The simulation closes with a brief instructor summary (≈5 min).'))+'</li></ul>'+
   '<label class="choice"><input type="checkbox" id="agree"><span>'+L('قرأنا العقد الخيالي والإفصاح وقواعد السلامة ونوافق على المشاركة.','We have read the fiction contract, AI disclosure and safety rules and agree to take part.')+'</span></label>'+
   '<div class="btn-row"><button class="btn btn-primary btn-lg" id="go" aria-disabled="true">▶ '+L('بدء المحاكاة','Start simulation')+'</button><a class="btn btn-ghost" href="#start">'+L('رجوع','Back')+'</a></div></div>';
  main.querySelectorAll('select[data-m]').forEach(s=>s.onchange=()=>{ S.roles[s.dataset.m]=s.value; persist(); });
  const ag=main.querySelector('#agree'), go=main.querySelector('#go'); ag.onchange=()=>go.setAttribute('aria-disabled',!ag.checked);
  go.onclick=()=>{ if(!ag.checked){ T.toast(L('يرجى تأكيد الموافقة أولاً.','Please confirm agreement first.'),'danger'); ag.focus(); return; } E.Orchestrator.start(S); T.save(true); T.go('sim/'+S.id); };
});
function steps(n){ const lab=[L('الدخول','Sign in'),L('التهيئة','Prebrief'),L('المحاكاة','Simulation'),L('الاختتام','Debrief'),L('القياس','Measurement')]; return '<ol class="stepper" aria-label="'+L('مراحل الجلسة','Session steps')+'">'+lab.map((l,i)=>'<li'+(i+1===n?' aria-current="step"':'')+(i+1<n?' class="done"':'')+'><span class="dot">'+(i+1<n?'✓':i+1)+'</span>'+l+'</li>').join('')+'</ol>'; }
function notFound(main){ main.innerHTML='<h1>'+L('غير موجود','Not found')+'</h1><div class="empty"><span class="big">🔎</span>'+L('لم يتم العثور على الجلسة. ربما حُذفت أو على جهاز آخر.','Session not found. It may have been deleted or be on another device.')+'<div style="margin-top:12px"><a class="btn btn-primary" href="#home">'+L('الرئيسية','Home')+'</a></div></div>'; }
window.TCS_UI.steps=steps; window.TCS_UI.notFound=notFound; window.TCS_UI.avatar=avatar; window.TCS_UI.stopTicker=stopTicker; window.TCS_UI.setTicker=f=>{ stopTicker(); ticker=setInterval(f,1000); };
})();
