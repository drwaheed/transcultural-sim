/* UI part 2: live simulation screen (chat, decision cards, timer, hints, safety, voice, facilitator drawer). */
(function(){
'use strict';
const T=window.TCS, E=window.TCS_ENGINE, C=window.TCS_CHARTS, U=window.TCS_UI, L=(a,e)=>T.L(a,e), esc=T.esc;
function fmtLeft(S){ return T.fmtTime(T.db.settings.simMinutes*60000-E.simElapsed(S)); }
function msgHTML(S,sc,e){
  if(e.kind==='student') return '<div class="msg me"><span class="av" style="background:var(--primary)" aria-hidden="true">'+esc(e.who.replace(/^\D+/,''))+'</span><div class="bub"><div class="who">'+esc(e.who)+' · '+esc(U.roleName(S.roles[e.who]||''))+(e.to&&e.to!=='all'?' → '+esc(E.persona(sc,e.to).short):'')+'</div><div class="txt">'+esc(e.text)+'</div></div></div>';
  if(e.kind==='agent'){ const p=E.persona(sc,e.who); return '<div class="msg">'+U.avatar(p)+'<div class="bub"><div class="who">'+esc(p.name)+(e.challenge?' <span class="badge warn">'+L('تحدٍّ','challenge')+'</span>':'')+'</div><div class="txt">'+esc(e.text)+'</div></div></div>'; }
  if(e.kind==='hint') return '<div class="msg sys hint"><div class="bub">💡 <span class="ltr">'+esc(e.text)+'</span><br><span class="xs">'+esc(e.ar||'')+'</span></div></div>';
  if(e.kind==='safety') return '<div class="msg sys safety" role="alert"><div class="bub">🛑 <b>'+esc(e.text)+'</b><br>'+L('توقفت المحاكاة. سيتواصل معكم الميسّر.','The simulation is paused. Your facilitator will check in.')+'</div></div>';
  if(e.kind==='dp_answer'||e.kind==='dp_revise'){ const dp=sc.dps.find(d=>d.id===e.dp); const o=dp&&dp.options.find(x=>x.id===e.opt); return '<div class="msg sys"><div class="bub">🧭 <b>'+esc(e.dp)+'</b> '+(e.kind==='dp_revise'?L('(تعديل) ','(revised) '):'')+L('قرار الفريق: ','Team decision: ')+'<span class="ltr">'+esc(o?o.t:'')+'</span>'+(o&&e.kind==='dp_answer'?'<br><span class="xs muted ltr">'+esc(o.conseq)+'</span>':'')+'</div></div>'; }
  if(e.kind==='system'&&/All 4|ended|PAUSED|RESUMED|started/.test(e.text)) return '<div class="msg sys"><div class="bub">'+esc(sysText(e.text))+'</div></div>';
  if(e.kind==='coach'&&S.mode==='practice') return '<div class="msg sys hint"><div class="bub">🎯 '+esc(e.text)+'</div></div>';
  return '';
}
function sysText(t){ if(/started/.test(t)) return L('بدأت المحاكاة. ابدؤوا بالتعارف.','Simulation started. Begin with introductions.'); if(/All 4/.test(t)) return L('اكتملت نقاط القرار الأربع. يمكنكم المتابعة قليلاً أو إنهاء المحاكاة.','All 4 decision points completed. You may continue briefly or end the simulation.'); if(/PAUSED/.test(t)) return L('⏸ أُوقفت المحاكاة مؤقتاً.','⏸ Simulation paused.'); if(/RESUMED/.test(t)) return L('▶ استؤنفت المحاكاة.','▶ Simulation resumed.'); return t; }
function dpHTML(S,sc){
  if(!S.dpPending) return ''; const dp=sc.dps.find(d=>d.id===S.dpPending); const ord=E.dpOrder(sc,dp); const n=sc.dps.indexOf(dp)+1;
  return '<section class="dp-card" id="dpCard" aria-labelledby="dpTitle"><h3 id="dpTitle">🧭 '+L('نقطة القرار','Decision point')+' '+n+'/4</h3><p class="q">'+esc(dp.q)+'</p>'+
   '<fieldset style="border:0;padding:0;margin:0"><legend class="sr-only">'+L('الخيارات','Options')+'</legend>'+ord.map((oid,i)=>{ const o=dp.options.find(x=>x.id===oid); return '<label class="choice"><input type="radio" name="dpo" value="'+o.id+'"><span class="ltr"><b>'+String.fromCharCode(65+i)+'.</b> '+esc(o.t)+'</span></label>'; }).join('')+'</fieldset>'+
   '<label class="fld"><span>'+L('تبرير الفريق (إلزامي، 15 حرفاً على الأقل)','Team rationale (required, min 15 characters)')+'</span><textarea id="dpJust" class="ltr" aria-describedby="dpErr" placeholder="We chose this because..."></textarea><span class="err" id="dpErr" role="alert"></span></label>'+
   '<div class="row"><label class="small">'+L('يسجّله: ','Recorded by: ')+'<select id="dpBy">'+S.members.map(m=>'<option'+(S.roles[m]==='documenter'?' selected':'')+'>'+m+'</option>').join('')+'</select></label><span class="spacer"></span><button class="btn btn-primary" id="dpSubmit">'+L('اعتماد القرار','Submit decision')+'</button></div></section>';
}
T.route('sim',(main,id)=>{
  const S=U.cur(id); if(!S) return U.notFound(main); const sc=T.scenario(S.scenario);
  if(S.status==='prebrief') return T.go('prebrief/'+id);
  if(['debrief','measure','extras','done'].includes(S.status)) return T.go('debrief/'+id);
  const s=T.db.settings; const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const lead=S.members.find(m=>S.roles[m]==='lead')||S.members[0];
  main.innerHTML='<h1 class="sr-only">'+L('المحاكاة','Simulation')+' '+esc(sc.id)+'</h1>'+
  '<div class="sim-head"><span class="badge pri">'+esc(sc.id)+' · '+sc.lecture+'</span><h2 style="margin:0;font-size:var(--fs-lg)">'+sc.icon+' '+esc(T.bi(sc.title))+'</h2><span class="spacer"></span>'+
   '<span class="badge '+(S.mode==='research'?'info':'warn')+'">'+(S.mode==='research'?L('بحث','Research'):L('تدريب','Practice'))+' · C'+S.cycle+'</span>'+
   '<span class="badge">'+(S.engine==='llm'?'LLM':L('دون اتصال','Offline'))+'</span>'+
   '<span class="timer" id="timer" role="timer" aria-label="'+L('الوقت المتبقي','Time remaining')+'">'+fmtLeft(S)+'</span></div>'+
  '<div class="persona-strip" aria-label="'+L('الشخصيات','Characters')+'">'+sc.personas.filter(p=>p.id!=='f2'||!sc.interpreter||S.flags.interpreter).map(p=>'<span class="pchip">'+U.avatar(p)+'<span><b>'+esc(p.name)+'</b><br><span class="xs muted">'+esc(T.bi(p.role))+'</span></span></span>').join('')+'</div>'+
  '<div class="sim"><div>'+
   '<div class="chat"><div class="chat-log" id="log" role="log" aria-live="polite" aria-relevant="additions" aria-label="'+L('سجل الحوار','Conversation log')+'" tabindex="0"></div>'+
   '<div class="typing" id="typing" aria-live="polite"></div>'+
   '<div class="composer" id="composer"><div class="row1"><label>'+L('المتحدث','Speaker')+' <select id="by">'+S.members.map(m=>'<option value="'+m+'"'+(m===lead?' selected':'')+'>'+m+' · '+esc(U.roleName(S.roles[m]))+'</option>').join('')+'</select></label>'+
    '<label>'+L('إلى','To')+' <select id="to"><option value="all">'+L('الجميع','Everyone')+'</option>'+sc.personas.map(p=>'<option value="'+p.id+'">'+esc(p.short)+'</option>').join('')+'</select></label><span class="spacer"></span>'+
    (sc.interpreter?'<button class="btn btn-sm btn-secondary" id="interp" type="button" aria-pressed="'+(!!S.flags.interpreter)+'">🎧 '+L('طلب مترجم مهني','Request professional interpreter')+'</button>':'')+
    '<button class="btn btn-sm btn-warn" id="pauseBtn" type="button">⏸ '+L('إيقاف (كلمة الأمان)','Pause (safety)')+'</button></div>'+
    '<div class="row2"><label for="msg" class="sr-only">'+L('رسالتكم بالإنجليزية','Your message in English')+'</label><textarea id="msg" placeholder="Type in English… (Enter = send, Shift+Enter = new line)" aria-describedby="msgHelp"></textarea>'+
    (SR&&s.voiceInput?'<button class="icon-btn" id="mic" type="button" aria-pressed="false" aria-label="'+L('إدخال صوتي','Voice input')+'" title="'+L('إدخال صوتي','Voice input')+'">🎙️</button>':'')+
    '<button class="btn btn-primary" id="send" type="button">'+L('إرسال','Send')+'</button></div><span id="msgHelp" class="sr-only">'+L('اكتب بالإنجليزية وخاطب المريض والأسرة باحترام.','Write in English and address the patient/family respectfully.')+'</span></div></div>'+
  '</div><aside class="side-panel stack" aria-label="'+L('معلومات الجلسة','Session info')+'">'+
   '<div class="card pad-sm"><h3>'+L('التقدم','Progress')+'</h3><div class="chip-list" id="dpProg"></div><p class="small" style="margin-top:8px">'+L('التلميحات: ','Hints: ')+'<b id="hintsUsed"></b>/'+E.hintRules(S).max+'</p>'+
    '<div class="btn-row"><button class="btn btn-sm btn-secondary" id="ttsBtn" aria-pressed="'+(!!s.tts)+'">🔊 '+L('قراءة الردود','Read replies')+'</button><button class="btn btn-sm btn-danger" id="endBtn">'+L('إنهاء المحاكاة','End simulation')+'</button></div></div>'+
   '<div class="card pad-sm"><h3>'+L('نواتج التعلم','Outcomes')+'</h3><ul class="small" style="padding-inline-start:1.2em;margin:0">'+sc.objectives.map(o=>'<li>'+esc(T.bi(o))+'</li>').join('')+'</ul></div>'+
   '<div class="card pad-sm fac-panel" id="facPanel"><h3>🔒 '+L('لوحة الميسّر','Facilitator panel')+'</h3><p class="small muted">'+L('مؤشر الثقة والبطاقات المخفية ظاهرة للميسّر فقط.','Trust meter and hidden cards are visible to the facilitator only.')+'</p><button class="btn btn-sm btn-secondary" id="unlock">'+L('فتح بالرمز','Unlock with PIN')+'</button></div>'+
  '</aside></div>';
  const logEl=main.querySelector('#log'), msg=main.querySelector('#msg'), send=main.querySelector('#send'), typing=main.querySelector('#typing');
  let rendered=0;
  function speak(e){ if(!T.db.settings.tts||!window.speechSynthesis||e.kind!=='agent') return; const p=E.persona(sc,e.who); const u=new SpeechSynthesisUtterance(e.text.replace(/\([^)]*\)/g,'')); u.lang='en-GB'; u.pitch=p.voice?p.voice.pitch:1; u.rate=p.voice?p.voice.rate:1; speechSynthesis.speak(u); }
  function renderLog(){ const evs=S.log.slice(rendered); let html=''; evs.forEach(e=>{ html+=msgHTML(S,sc,e); if(rendered>0) speak(e); }); rendered=S.log.length; if(html) logEl.insertAdjacentHTML('beforeend',html);
    const old=logEl.querySelector('#dpCard'); if(old) old.remove(); if(S.dpPending){ logEl.insertAdjacentHTML('beforeend',dpHTML(S,sc)); bindDP(); }
    logEl.scrollTop=logEl.scrollHeight; updateSide(); }
  function updateSide(){
    main.querySelector('#dpProg').innerHTML=sc.dps.map((d,i)=>{ const r=S.dps[d.id]; return '<span class="dom '+(r&&r.answer?'on':'off')+'">'+(r&&r.answer?'✓':'○')+' DP'+(i+1)+'</span>'; }).join('');
    main.querySelector('#hintsUsed').textContent=S.hintsUsed;
    const locked=!!S.dpPending||S.status!=='running'; msg.disabled=locked; send.disabled=locked; msg.placeholder=S.dpPending?L('أجيبوا عن نقطة القرار أولاً…','Answer the decision point first…'):S.status==='paused'?L('المحاكاة متوقفة مؤقتاً','Simulation paused'):'Type in English… (Enter = send, Shift+Enter = new line)';
    const pb=main.querySelector('#pauseBtn'); pb.textContent=S.status==='paused'?'▶ '+L('استئناف','Resume'):'⏸ '+L('إيقاف (كلمة الأمان)','Pause (safety)');
    if(T.isFac()) renderFac();
  }
  function bindDP(){ const c=logEl.querySelector('#dpCard'); c.querySelector('#dpSubmit').onclick=()=>{ const o=c.querySelector('input[name=dpo]:checked'), j=c.querySelector('#dpJust'), err=c.querySelector('#dpErr');
      if(!o){ err.textContent=L('اختاروا خياراً.','Choose an option.'); c.querySelector('input[name=dpo]').focus(); return; }
      if(j.value.trim().length<15){ err.textContent=L('اكتبوا تبريراً (15 حرفاً على الأقل).','Write a rationale (at least 15 characters).'); j.setAttribute('aria-invalid','true'); j.focus(); return; }
      E.Orchestrator.answerDP(S,S.dpPending,o.value,j.value.trim(),c.querySelector('#dpBy').value); T.save(true); T.announce(L('تم اعتماد القرار','Decision recorded')); renderLog(); msg.focus(); };
    if(!c.dataset.focused){ c.dataset.focused=1; setTimeout(()=>c.querySelector('h3').setAttribute('tabindex','-1')||c.querySelector('h3').focus(),50); T.announce(L('نقطة قرار جديدة','New decision point')); } }
  async function doSend(){ const text=msg.value.trim(); if(!text||send.disabled) return; if(text.length>800){ T.toast(L('الرسالة طويلة جداً (800 حرف كحد أقصى).','Message too long (800 characters max).'),'danger'); return; }
    msg.value=''; send.disabled=true; const by=main.querySelector('#by').value, to=main.querySelector('#to').value;
    if(E.RX.pii.test(text)) T.toast(L('أُزيلت بيانات تعريفية محتملة من رسالتك.','Possible identifying data was removed from your message.'),'danger');
    const pr=S.log.length; const p=E.persona(sc,to!=='all'?to:'p'); typing.textContent=p.short+' '+L('يكتب…','is typing…');
    const tempStudent=S.log.length; try{ await E.Orchestrator.student(S,text,by,to); }catch(err){ T.toast(L('خطأ: ','Error: ')+err.message,'danger'); }
    typing.textContent=''; T.save(true); renderLog(); send.disabled=!!S.dpPending; if(!S.dpPending) msg.focus();
    if(S.status==='paused') T.toast(L('أُوقفت المحاكاة بكلمة الأمان.','Simulation paused by safety word.'),'danger');
  }
  send.onclick=doSend; msg.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); doSend(); } });
  main.querySelector('#pauseBtn').onclick=()=>{ if(S.status==='paused'){ E.Orchestrator.resume(S,'student'); } else { E.Orchestrator.pause(S,'student-button'); E.log(S,'safety','orchestrator','The simulation is paused. Your facilitator will check in with you.'); } T.save(true); renderLog(); };
  main.querySelector('#endBtn').onclick=async()=>{ const allDone=!E.Orchestrator.nextDP(S); if(!allDone&&!(await T.confirmDlg(L('إنهاء المحاكاة؟','End the simulation?'),L('لم تكتمل نقاط القرار الأربع بعد. هل تريد الإنهاء الآن؟','Not all 4 decision points are complete. End now?'),L('إنهاء','End')))) return; E.Orchestrator.end(S,allDone?'completed':'ended early'); T.save(true); T.go('debrief/'+S.id); };
  const tts=main.querySelector('#ttsBtn'); if(!window.speechSynthesis) tts.hidden=true; tts.onclick=()=>{ s.tts=!s.tts; tts.setAttribute('aria-pressed',s.tts); T.save(); T.toast(s.tts?L('قراءة الردود مفعّلة','Read-aloud on'):L('قراءة الردود متوقفة','Read-aloud off')); };
  const ib=main.querySelector('#interp'); if(ib) ib.onclick=()=>{ if(S.flags.interpreter) return; S.flags.interpreter=true; E.log(S,'flag','orchestrator','Professional interpreter used',{flag:'interpreter',student:main.querySelector('#by').value}); E.log(S,'student',main.querySelector('#by').value,'[Requests a professional telephone interpreter]',{student:main.querySelector('#by').value,codes:['INIT'],domains:['comm'],words:5,sentiment:0,gapMs:0}); S.turns++; E.log(S,'agent','f2','Hello, I am the interpreter. Everything said here is confidential. I will interpret everything exactly.',{persona:'Interpreter'}); ib.setAttribute('aria-pressed','true'); T.save(true); T.render(); };
  const mic=main.querySelector('#mic'); if(mic){ let rec=null; mic.onclick=()=>{ if(rec){ rec.stop(); return; } rec=new SR(); rec.lang='en-US'; rec.interimResults=true; rec.onresult=ev=>{ msg.value=[...ev.results].map(r=>r[0].transcript).join(' '); }; rec.onend=()=>{ rec=null; mic.setAttribute('aria-pressed','false'); mic.textContent='🎙️'; }; rec.onerror=ev=>T.toast(L('تعذّر الإدخال الصوتي: ','Voice input failed: ')+ev.error,'danger'); rec.start(); mic.setAttribute('aria-pressed','true'); mic.textContent='⏺'; }; }
  main.querySelector('#unlock').onclick=async()=>{ if(await T.pinDlg()) renderFac(); };
  function renderFac(){
    const fp=main.querySelector('#facPanel'); const A=E.Analytics.session(S); const ew=E.Analytics.earlyWarnings(S); const tips=E.Coach.suggestions(S);
    fp.innerHTML='<h3>🔓 '+L('لوحة الميسّر','Facilitator panel')+'</h3>'+
     '<p class="small" style="margin:0">'+L('ثقة المريض','Patient trust')+': <b>'+S.trust+'/10</b> ('+E.trustBand(S.trust)+')</p><div class="meter" role="meter" aria-valuemin="0" aria-valuemax="10" aria-valuenow="'+S.trust+'" aria-label="'+L('مقياس الثقة','Trust meter')+'"><i style="width:'+S.trust*10+'%"></i></div>'+
     C.line(S.trustCurve.map(p=>({x:+(p.t/60000).toFixed(1),y:p.v,title:p.reason})),{w:300,h:130,label:L('منحنى الثقة','Trust curve'),xlabel:L('دقيقة','min')})+
     '<h4 style="margin-top:8px">'+L('البطاقات المخفية','Hidden cards')+'</h4><ul class="small" style="padding-inline-start:1.1em;margin:0">'+sc.cards.map(c=>'<li>'+(S.revealed.includes(c.id)?'✅':'🔒')+' '+esc(c.title)+(S.nearMiss[c.id]&&!S.revealed.includes(c.id)?' <span class="badge warn">'+L('محاولة قريبة','near')+' ×'+S.nearMiss[c.id]+'</span>':'')+'</li>').join('')+'</ul>'+
     '<h4 style="margin-top:8px">Giger</h4><div class="chip-list">'+E.DOMAINS.map(d=>'<span class="dom '+(A.giger[d]?'on':'off')+'">'+esc(T.bi(E.GIGER[d]))+(A.giger[d]?' ·'+A.giger[d]:'')+'</span>').join('')+'</div>'+
     '<dl class="kv" style="margin-top:8px"><dt>'+L('أدوار الكلام/10د','Turns/10 min')+'</dt><dd>'+A.turnsPer10+'</dd><dt>'+L('أسئلة مفتوحة','Open Q')+'</dt><dd>'+A.open+'</dd><dt>'+L('تعاطف','Empathy')+'</dt><dd>'+A.emp+'</dd><dt>'+L('حكمية','Judgmental')+'</dt><dd>'+A.judg+'</dd><dt>'+L('توازن المشاركة','Balance')+'</dt><dd>'+A.balance+'</dd></dl>'+
     (ew.length?'<div class="alert warn small" style="margin-top:8px"><div><b>'+L('إنذار مبكر','Early warning')+'</b><ul style="margin:4px 0 0;padding-inline-start:1.1em">'+ew.map(w=>'<li><span class="mono">'+w.student+'</span>: '+esc(T.bi(w.msg))+'</li>').join('')+'</ul></div></div>':'')+
     '<h4 style="margin-top:8px">'+L('مساعد الميسّر','Co-pilot')+'</h4><ul class="small" style="padding-inline-start:1.1em;margin:0">'+tips.map(t=>'<li class="'+(t.k==='danger'?'err':'')+'">'+esc(T.bi(t))+'</li>').join('')+'</ul><div id="llmCoach" class="small"></div>'+
     '<div class="btn-row" style="margin-top:8px"><button class="btn btn-sm btn-secondary" id="fHint">💡 '+L('إرسال تلميح من البنك','Send bank hint')+'</button><button class="btn btn-sm btn-secondary" id="fDP">🧭 '+L('إطلاق نقطة القرار التالية','Release next DP')+'</button>'+(E.LLM.ready()?'<button class="btn btn-sm btn-secondary" id="fAI">✨ '+L('اقتراحات AI','AI coaching')+'</button>':'')+'<button class="btn btn-sm btn-danger" id="fStop">⏹ '+L('إيقاف نهائي','STOP')+'</button><a class="btn btn-sm btn-ghost" href="#fac/live/'+S.id+'">'+L('اللوحة الكاملة','Full dashboard')+'</a></div>';
    fp.querySelector('#fHint').onclick=()=>{ const h=E.Orchestrator.maybeHint(S,Date.now(),true); if(!h) T.toast(L('لا تلميحات متبقية','No hints remaining')); T.save(true); renderLog(); };
    fp.querySelector('#fDP').onclick=()=>{ if(!E.Orchestrator.forceDP(S)) T.toast(L('توجد نقطة قرار معلقة أو اكتملت النقاط','A DP is pending or all are complete')); T.save(true); renderLog(); };
    fp.querySelector('#fStop').onclick=async()=>{ if(await T.confirmDlg(L('إيقاف نهائي','STOP session'),L('سيتم إنهاء الجلسة فوراً ووسمها كمتوقفة.','The session will end immediately and be marked as stopped.'),L('إيقاف','Stop'))){ E.Orchestrator.end(S,'stopped'); S.status='debrief'; S.stoppedByFacilitator=true; T.save(true); T.go('debrief/'+S.id); } };
    const ai=fp.querySelector('#fAI'); if(ai) ai.onclick=async()=>{ const box=fp.querySelector('#llmCoach'); box.textContent=L('جارٍ التوليد…','Generating…'); try{ box.innerHTML='<div class="alert info ltr" style="white-space:pre-wrap">'+esc(await E.Coach.llm(S))+'</div>'; }catch(e){ box.innerHTML='<p class="err">'+esc(e.message)+'</p>'; } };
  }
  renderLog(); if(T.isFac()) renderFac(); msg.focus();
  let n=0; U.setTicker(()=>{ const tm=main.querySelector('#timer'); if(!tm) return U.stopTicker(); const r=E.Orchestrator.tick(S); tm.textContent=fmtLeft(S); tm.classList.toggle('low',T.db.settings.simMinutes*60000-E.simElapsed(S)<5*60000);
    if(r.ended){ T.save(true); T.toast(L('انتهى وقت المحاكاة.','Simulation time is up.')); return T.go('debrief/'+S.id); }
    if(r.hint||r.dp){ T.save(true); renderLog(); if(r.hint) T.announce(L('تلميح جديد','New hint')); }
    if(++n%5===0){ T.save(); if(T.isFac()) renderFac(); } });
});
})();
