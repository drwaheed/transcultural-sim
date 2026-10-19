/* UI part 3: closing (Cycle 1 brief summary / Cycle 2 PEARLS), measurement step, post-session learning (released identically in both cycles). */
(function(){
'use strict';
const T=window.TCS, E=window.TCS_ENGINE, C=window.TCS_CHARTS, U=window.TCS_UI, L=(a,e)=>T.L(a,e), esc=T.esc;
const PEARLS=[
 {id:'reactions',ar:'ردود الفعل',en:'Reactions',q:[{ar:'كيف تشعرون الآن؟','en':'How are you feeling right now?'}]},
 {id:'description',ar:'الوصف',en:'Description',q:[{ar:'لخّصوا ما حدث في الحالة بإيجاز. ما المشكلات الرئيسية؟',en:'Briefly summarise what happened. What were the main issues?'}]},
 {id:'analysis',ar:'التحليل',en:'Analysis',q:[{ar:'ما الذي ترونه قد سار بشكل جيد؟',en:'What do you think went well?'},{ar:'ما الذي لم يسر بشكل جيد؟',en:'What did not go so well?'}]},
 {id:'summary',ar:'التلخيص',en:'Summary',q:[{ar:'ماذا ستفعلون بشكل مختلف في المرة القادمة؟',en:'What will you do differently next time?'},{ar:'هل تحتاجون إلى أي دعم إضافي بعد هذا؟',en:'Do you need any further support following this?'},{ar:'هل هناك أي شيء آخر تودون مشاركته؟',en:'Is there anything else you want to share?'}]}
];
const LEIN={preservation:{ar:'المحافظة/الحفاظ على الرعاية الثقافية',en:'Culture care preservation/maintenance'},accommodation:{ar:'التكيّف/التفاوض',en:'Culture care accommodation/negotiation'},repatterning:{ar:'إعادة التنميط/إعادة البناء',en:'Culture care repatterning/restructuring'}};
function timelineHTML(S){ const tl=E.Debrief.timeline(S); if(!tl.length) return '<p class="muted">'+L('لا أحداث بعد.','No events yet.')+'</p>'; return '<ol class="timeline">'+tl.map(x=>'<li class="'+x.kind+'"><time>'+T.fmtTime(x.t)+'</time><span class="ltr" style="display:inline">'+esc(x.label)+'</span></li>').join('')+'</ol>'; }
T.route('debrief',(main,id)=>{
  const S=U.cur(id); if(!S) return U.notFound(main); const sc=T.scenario(S.scenario);
  if(S.status==='running'||S.status==='paused') return T.go('sim/'+id);
  if(!S.debrief) { S.debrief={type:S.debriefType||'summary',startedAt:Date.now(),phases:{},notes:''}; T.save(true); }
  const D=S.debrief; const pearls=D.type==='pearls';
  const elapsed=()=>T.fmtTime(Date.now()-D.startedAt);
  main.innerHTML=U.steps(4)+'<h1>'+(pearls?L('الاستخلاص المنظم PEARLS','Structured PEARLS debrief'):L('الملخص القصير من المدرّس','Brief instructor summary'))+'</h1>'+
   '<div class="row" style="margin-bottom:var(--s4)"><span class="badge pri">'+esc(sc.id)+' · C'+S.cycle+'</span><span class="badge">'+(pearls?'25–30':'≈5')+' '+L('دقيقة','min')+'</span><span class="timer" id="dbTimer" role="timer" aria-label="'+L('مدة الاختتام','Closing time')+'">'+elapsed()+'</span>'+(S.stoppedByFacilitator?'<span class="badge danger">'+L('أوقفها الميسّر','stopped by facilitator')+'</span>':'')+'</div><div id="dbBody"></div>';
  const body=main.querySelector('#dbBody');
  if(!pearls){
    body.innerHTML='<div class="card"><p>'+L('هذا هو الإغلاق المعتاد في الممارسة الحالية: يلخّص المدرّس الحالة بإيجاز دون استخلاص منظم ودون تحليل آلي (الدورة 1).','This is the usual closing in current practice: the instructor briefly summarises the case, with no structured debriefing and no automated analysis (Cycle 1).')+'</p>'+
     '<ul><li>'+L('تلخيص وقائع الحالة الرئيسية.','Summarise the key facts of the case.')+'</li><li>'+L('توضيح مفهوم رئيسي واحد مرتبط بالمحاضرة ','Clarify one key concept linked to lecture ')+sc.lecture+'.</li><li>'+L('شكر الفريق وإنهاء الجلسة.','Thank the team and close.')+'</li></ul>'+
     '<label class="fld"><span>'+L('ملاحظات المدرّس (اختياري، بلا أسماء)','Instructor notes (optional, no names)')+'</span><textarea id="dbNotes">'+esc(D.notes||'')+'</textarea></label>'+
     '<button class="btn btn-primary btn-lg" id="dbDone">'+L('إنهاء الملخص والانتقال إلى القياس','Finish summary → measurement')+'</button></div>';
    body.querySelector('#dbNotes').oninput=e=>{ D.notes=e.target.value; T.save(); };
  } else {
    let ph=D.phase||0;
    const draw=()=>{ const P=PEARLS[ph]; D.phase=ph;
      body.innerHTML='<ol class="stepper" aria-label="PEARLS">'+PEARLS.map((p,i)=>'<li'+(i===ph?' aria-current="step"':'')+(i<ph?' class="done"':'')+'><span class="dot">'+(i<ph?'✓':i+1)+'</span>'+(T.lang()==='ar'?p.ar:p.en)+'</li>').join('')+'</ol>'+
      '<div class="grid g2"><div class="card"><h2>'+(i=>(T.lang()==='ar'?P.ar:P.en))()+' <span class="muted small">('+P.en+')</span></h2>'+
       P.q.map((q,k)=>'<label class="fld"><span>'+esc(T.bi(q))+'</span><textarea data-k="'+P.id+'_'+k+'" placeholder="'+L('ملاحظات الفريق…','Team notes…')+'">'+esc(D.phases[P.id+'_'+k]||'')+'</textarea></label>').join('')+
       (P.id==='summary'?'<div class="alert info small">📌 '+L('اربطوا ما تعلمتموه بمشروع الأسبوع 13 في المقرر.','Link what you learned to the Week-13 course project.')+'</div>':'')+
       '<div class="btn-row"><button class="btn btn-secondary" id="prev" '+(ph===0?'disabled':'')+'>→ '+L('السابق','Previous')+'</button><span class="spacer"></span>'+(ph<3?'<button class="btn btn-primary" id="next">'+L('التالي','Next')+' ←</button>':'<button class="btn btn-primary" id="dbDone">'+L('إنهاء الاستخلاص والانتقال إلى القياس','Finish debrief → measurement')+'</button>')+'</div></div>'+
       '<div class="card" id="phaseAid"></div></div>'+
       '<div class="card fac-panel" style="margin-top:var(--s4)" id="dsa"><h3>🔒 '+L('وكيل دعم الاستخلاص (للميسّر فقط)','Debrief-support agent (facilitator only)')+'</h3><button class="btn btn-sm btn-secondary" id="unlockD">'+L('فتح بالرمز','Unlock with PIN')+'</button></div>';
      const aid=body.querySelector('#phaseAid');
      if(P.id==='reactions') aid.innerHTML='<h3>'+L('توجيه','Guidance')+'</h3><p class="small">'+L('ابدأ بالمشاعر قبل التحليل؛ اسمح لكل عضو بالحديث. «ما أول كلمة تصف شعورك الآن؟»','Start with feelings before analysis; let each member speak. "What one word describes how you feel now?"')+'</p>'+(sc.sensitive?'<div class="alert warn small">'+L('سيناريو حساس: تحقّق من سلامة الطلبة النفسية وقدّم معلومات الدعم والإرشاد الموثقة.','Sensitive scenario: check students\' wellbeing and provide verified counselling/support information.')+'</div>':'');
      if(P.id==='description') aid.innerHTML='<h3>'+L('الخط الزمني التلقائي','Auto-generated timeline')+'</h3>'+timelineHTML(S);
      if(P.id==='analysis'){ const R=E.Debrief.report(S); aid.innerHTML='<h3>'+L('مجالات Giger','Giger domains')+'</h3><div class="chip-list">'+E.DOMAINS.map(d=>'<span class="dom '+(R.covered.includes(d)?'on':'off')+'">'+(R.covered.includes(d)?'✓ ':'○ ')+esc(T.bi(E.GIGER[d]))+'</span>').join('')+'</div>'+
        '<h3 style="margin-top:12px">'+L('قراراتكم وخيارات Leininger','Your decisions & Leininger options')+'</h3><ul class="small">'+R.decisions.map(d=>'<li><b>'+d.id+'</b>: '+(d.lein?esc(T.bi(LEIN[d.lein])):'—')+'</li>').join('')+'</ul>'+
        '<p class="small muted">'+L('ناقشوا: أي خيار (محافظة، تفاوض، إعادة تنميط) كان الأنسب، ولماذا؟ ما التباين الفردي الذي لاحظتموه؟','Discuss: which option (preservation, negotiation, repatterning) fit best, and why? What individual variation did you notice?')+'</p>'+
        '<h3>'+L('تعليم موجّه عند الحاجة','Directed teaching if needed')+'</h3><ul class="small ltr">'+sc.expected.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><a class="btn btn-sm btn-secondary" href="#mod/'+sc.lecture+'/1">📚 '+L('مراجعة المحاضرة ','Review lecture ')+sc.lecture+'</a>'; }
      if(P.id==='summary') aid.innerHTML='<h3>'+L('رسائل للحفظ','Take-home messages')+'</h3><ul class="small">'+sc.objectives.map(o=>'<li>'+esc(T.bi(o))+'</li>').join('')+'</ul><p class="small muted">'+L('ASKED: الوعي، المهارة، المعرفة، المواجهات، الرغبة — أيها نما اليوم؟','ASKED: Awareness, Skill, Knowledge, Encounters, Desire — which grew today?')+'</p>';
      body.querySelectorAll('textarea[data-k]').forEach(t=>t.oninput=()=>{ D.phases[t.dataset.k]=t.value; T.save(); });
      const pv=body.querySelector('#prev'); if(pv) pv.onclick=()=>{ ph--; draw(); body.querySelector('h2').focus&&body.querySelector('h2').setAttribute('tabindex','-1'); };
      const nx=body.querySelector('#next'); if(nx) nx.onclick=()=>{ ph++; T.save(); draw(); const h=body.querySelector('h2'); h.setAttribute('tabindex','-1'); h.focus(); };
      const dd=body.querySelector('#dbDone'); if(dd) dd.onclick=finish;
      const unlock=async()=>{ if(!(await T.pinDlg())) return; const ds=body.querySelector('#dsa'); const ms=E.Debrief.advocacy(S);
        ds.innerHTML='<h3>🔓 '+L('وكيل دعم الاستخلاص (للميسّر فقط)','Debrief-support agent (facilitator only)')+'</h3><div class="grid g2"><div><h4>'+L('لحظات تعلم رئيسية','Key learning moments')+'</h4>'+(ms.length?'<ol class="small">'+ms.map(m=>'<li><b>'+esc(m.type)+'</b> ('+T.fmtTime(m.t)+', '+m.link+'): <q class="ltr">'+esc(m.quote.slice(0,140))+'</q> — '+esc(m.why)+'</li>').join('')+'</ol>':'<p class="muted small">'+L('لا لحظات مرصودة.','No moments detected.')+'</p>')+'</div><div><h4>'+L('صيغ Advocacy-Inquiry مقترحة','Suggested advocacy-inquiry stems')+'</h4><ul class="small">'+ms.map(m=>'<li>'+esc(m.stem)+'</li>').join('')+'</ul><h4>'+L('أخطاء/تنبيهات الذكاء الاصطناعي','AI errors / guardrail flags')+'</h4><p class="small">'+(S.guard.length?S.guard.map(g=>esc(g.type+(g.issues?': '+g.issues.join(', '):''))).join('<br>'):L('لا شيء','None'))+'</p></div></div>'+(E.LLM.ready()?'<button class="btn btn-sm btn-secondary" id="dsLLM">✨ '+L('ملخص سردي بالنموذج اللغوي','LLM narrative summary')+'</button><div id="dsOut"></div>':'');
        const b=ds.querySelector('#dsLLM'); if(b) b.onclick=async()=>{ const o=ds.querySelector('#dsOut'); o.textContent=L('جارٍ التوليد…','Generating…'); try{ o.innerHTML='<div class="alert info ltr" style="white-space:pre-wrap">'+esc(await E.Debrief.llmNarrative(S))+'</div>'; }catch(e){ o.innerHTML='<p class="err">'+esc(e.message)+'</p>'; } }; };
      body.querySelector('#unlockD').onclick=unlock; if(T.isFac()) unlock();
    };
    draw();
  }
  function finish(){ D.endedAt=Date.now(); D.durationMs=D.endedAt-D.startedAt; S.status='measure'; E.log(S,'system','orchestrator','Closing finished ('+D.type+', '+Math.round(D.durationMs/60000)+' min)'); T.save(true); T.go('measure/'+S.id); }
  const dd=body.querySelector('#dbDone'); if(dd&&!pearls) dd.onclick=finish;
  U.setTicker(()=>{ const t=main.querySelector('#dbTimer'); if(!t) return U.stopTicker(); t.textContent=elapsed(); });
});
T.route('measure',(main,id)=>{
  const S=U.cur(id); if(!S) return U.notFound(main); const tp=S.mode==='research'?(S.cycle===1?'T1':'T2'):'—';
  const obsDone=T.db.obs.filter(o=>o.sessionId===S.id).length;
  main.innerHTML=U.steps(5)+'<h1>'+L('القياس','Measurement')+' '+(tp!=='—'?tp:'')+'</h1>'+
  '<div class="grid g2"><div class="card"><h2>'+L('للطلبة','For students')+'</h2><ol><li>'+L('أكملوا الآن مقياس الانخراط (الأداة 1) الذي يوزعه الزميل المحايد — نقطة القياس ','Complete the engagement scale (Tool 1) now, administered by the neutral colleague — measurement point ')+'<b>'+tp+'</b>.</li><li>'+(S.cycle===1?L('ثم الاختبار 1 (Test 1) وفق جدول المقرر.','Then Test 1 as scheduled in the course.'):L('ثم الاختبار 2 (Test 2) وفق جدول المقرر.','Then Test 2 as scheduled in the course.'))+'</li></ol><p class="small muted">'+L('مواد التعلم بعد الجلسة (التقرير والتأمل والاختبار القصير) تُفتح بعد القياس بالطريقة نفسها في الدورتين للحفاظ على تكافؤ الشروط.','Post-session learning (report, reflection, quiz) opens after measurement in exactly the same way in both cycles, to keep conditions equal.')+'</p></div>'+
  '<div class="card"><h2>'+L('للميسّر: الأداة 2','For the facilitator: Tool 2')+'</h2><p>'+L('سجّل ملاحظة الانخراط لكل طالب (18 بنداً + 6 بنود مضافة). سُجّلت: ','Record the engagement observation for each student (18 items + 6 added items). Recorded: ')+'<b>'+obsDone+'/'+S.members.length+'</b></p><a class="btn btn-primary" href="#fac/obs/'+S.id+'">📝 '+L('فتح نموذج الملاحظة','Open observation form')+'</a></div></div>'+
  '<div class="btn-row" style="margin-top:var(--s4)"><button class="btn btn-primary btn-lg" id="toExtras">'+L('اكتمل القياس — فتح مواد ما بعد الجلسة','Measurement complete — open post-session learning')+'</button></div>';
  main.querySelector('#toExtras').onclick=()=>{ S.measure={done:true,at:new Date().toISOString(),timepoint:tp}; S.status='extras'; T.save(true); T.go('extras/'+S.id); };
});
T.route('extras',(main,id)=>{
  const S=U.cur(id); if(!S) return U.notFound(main); const sc=T.scenario(S.scenario);
  if(S.status==='measure') return T.go('measure/'+id);
  const R=E.Debrief.report(S), A=R.A;
  main.innerHTML='<h1>'+L('تعلّم ما بعد الجلسة','Post-session learning')+' · '+esc(S.team)+'</h1><div class="alert info small">ℹ️ '+L('تُعرض هذه المواد بعد القياس وبالطريقة نفسها في الدورتين. المؤشرات استكشافية وليست للتقييم.','Shown after measurement, identically in both cycles. Indicators are exploratory, not for grading.')+'</div>'+
  '<div class="grid g2"><section class="card" aria-labelledby="ccr"><h2 id="ccr">🌍 '+L('تقرير الكفاءة الثقافية للفريق','Team cultural-competence report')+'</h2>'+
   '<h3>'+L('مجالات Giger','Giger domains')+' ('+R.covered.length+'/6)</h3><div class="chip-list">'+E.DOMAINS.map(d=>'<span class="dom '+(R.covered.includes(d)?'on':'off')+'">'+(R.covered.includes(d)?'✓ ':'○ ')+esc(T.bi(E.GIGER[d]))+'</span>').join('')+'</div>'+
   '<h3 style="margin-top:12px">'+L('نقاط القوة','Strengths')+'</h3>'+(R.strengths.length?'<ul class="small">'+R.strengths.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':'<p class="small muted">—</p>')+
   '<h3>'+L('إشارات فائتة','Missed cues')+'</h3>'+(R.missedCues.length?'<ul class="small">'+R.missedCues.map(c=>'<li><b class="ltr">'+esc(c.title)+'</b> — <span class="ltr">'+esc(c.cue)+'</span>'+(c.near?' <span class="badge warn">'+L('محاولة قريبة','near-miss')+'</span>':'')+'</li>').join('')+'</ul>':'<p class="small">'+L('لا شيء — كُشفت كل المعلومات.','None — all information uncovered.')+'</p>')+
   '<h3>'+L('تنبيهات اللغة الحكمية/التنميطية','Judgmental/stereotyping flags')+'</h3>'+(R.flags.length?'<ul class="small">'+R.flags.map(f=>'<li>'+T.fmtTime(f.t)+' <q class="ltr">'+esc(f.text)+'</q>'+(f.stereo?' <span class="badge danger">'+L('تنميط','stereotype')+'</span>':'')+'</li>').join('')+'</ul>':'<p class="small">'+L('لم تُرصد.','None detected.')+'</p>')+
   '<h3>'+L('القرارات','Decisions')+'</h3><div class="tbl-wrap" tabindex="0"><table class="tbl"><thead><tr><th>DP</th><th>'+L('الاختيار','Choice')+'</th><th>Leininger</th><th>'+L('الجودة','Quality')+'</th></tr></thead><tbody>'+R.decisions.map(d=>'<tr><td>'+d.id+'</td><td class="ltr small">'+esc(d.choice||'—')+'</td><td class="small">'+(d.lein?esc(T.bi(LEIN[d.lein])):'—')+'</td><td>'+(d.quality==null?'—':['○','◐','●'][d.quality])+'</td></tr>').join('')+'</tbody></table></div>'+
   '<h3 style="margin-top:12px">'+L('خطوات التحسين','Next steps')+'</h3><ul class="small">'+R.next.slice(0,6).map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul><p class="small muted">'+L('التباين الفردي في هذه الحالة: ','Individual variation in this case: ')+'<span class="ltr">'+esc(R.variation)+'</span></p>'+
   '<button class="btn btn-sm btn-secondary no-print" onclick="window.print()">🖨️ '+L('طباعة/حفظ PDF','Print / save PDF')+'</button></section>'+
  '<section class="card" aria-labelledby="eng"><h2 id="eng">📈 '+L('مؤشرات الانخراط (من السجلات)','Engagement indicators (from logs)')+'</h2>'+C.radar([{name:S.team,values:[A.behavioural,A.cognitive,A.emotional]}],[L('سلوكي','Behavioural'),L('معرفي','Cognitive'),L('انفعالي','Emotional')],{size:260,label:L('مخطط رادار الانخراط','Engagement radar')})+
   C.line(S.trustCurve.map(p=>({x:+(p.t/60000).toFixed(1),y:p.v})),{label:L('منحنى ثقة المريض','Patient trust curve'),xlabel:L('دقيقة','minute')})+'</section></div>'+
  '<section class="card" style="margin-top:var(--s4)" aria-labelledby="sbarH"><h2 id="sbarH">📝 '+L('توثيق SBAR (الموثّق)','SBAR documentation (documenter)')+'</h2><p class="small muted">'+L('اكتبوا ملاحظة تسليم بصيغة S/B/A/R بالإنجليزية. ستحصلون على تغذية راجعة تلقائية.','Write an S/B/A/R handoff note in English. You will get automatic feedback.')+'</p><textarea id="sbar" class="ltr" style="min-height:160px" placeholder="S: ...\nB: ...\nA: ...\nR: ...">'+esc(S.sbar?S.sbar.text:'')+'</textarea><div class="btn-row" style="margin-top:8px"><button class="btn btn-primary" id="sbarBtn">'+L('تحليل الملاحظة','Check my note')+'</button>'+(E.LLM.ready()?'<button class="btn btn-secondary" id="sbarAI">✨ '+L('تغذية راجعة بالنموذج','AI feedback')+'</button>':'')+'</div><div id="sbarOut" aria-live="polite"></div></section>'+
  '<section class="card" style="margin-top:var(--s4)"><h2>🧑‍🎓 '+L('للأعضاء: التأمل والاختبار والمراجعة','For members: reflection, quiz & review')+'</h2><p class="small">'+L('كل طالب يدخل برمزه إلى بوابة الطالب لكتابة يومية التأمل (مع أسئلة مولدة من هذه الجلسة) وحل اختبار المحاضرة ','Each student opens the student hub with their code to write a reflection journal (with prompts generated from this session) and take the quiz for lecture ')+sc.lecture+'.</p><div class="btn-row">'+S.members.map(m=>'<a class="btn btn-sm btn-secondary mono" href="#hub/'+m+'/journal/'+S.id+'">'+m+'</a>').join('')+'</div></section>'+
  '<div class="btn-row" style="margin-top:var(--s4)"><button class="btn btn-primary" id="finish">✔ '+L('إنهاء الجلسة','Finish session')+'</button><a class="btn btn-ghost" href="#home">'+L('الرئيسية','Home')+'</a></div>';
  const out=main.querySelector('#sbarOut');
  main.querySelector('#sbarBtn').onclick=()=>{ const tx=main.querySelector('#sbar').value; const fb=E.SBAR.feedback(S,tx); S.sbar={text:tx,score:fb.score,at:new Date().toISOString()}; T.save(true);
    out.innerHTML='<p style="margin-top:8px"><b>'+L('الدرجة التكوينية: ','Formative score: ')+fb.score+'%</b></p><ul class="small" style="list-style:none;padding:0">'+fb.items.map(i=>'<li>'+(i.ok?'✅':'⚠️')+' '+esc(T.bi(i))+'</li>').join('')+'</ul>'; };
  const ai=main.querySelector('#sbarAI'); if(ai) ai.onclick=async()=>{ out.textContent=L('جارٍ التوليد…','Generating…'); try{ const r=await E.LLM.chat([{role:'system',content:'You give brief formative feedback (max 120 words, 4 bullets) on a nursing student SBAR note for a fictional transcultural community-health case. Be kind, specific, non-judgmental. Do not grade.'},{role:'user',content:'Case: '+sc.setting.en+'\nKnown findings: '+S.revealed.map(id=>sc.cards.find(c=>c.id===id).fact).join(' | ')+'\nNote:\n'+main.querySelector('#sbar').value}],{maxTokens:260}); out.innerHTML='<div class="alert info ltr" style="white-space:pre-wrap;margin-top:8px">'+esc(r)+'</div>'; }catch(e){ out.innerHTML='<p class="err">'+esc(e.message)+'</p>'; } };
  main.querySelector('#finish').onclick=()=>{ S.status='done'; S.finishedAt=new Date().toISOString(); T.save(true); T.toast(L('اكتملت الجلسة وحُفظت.','Session completed and saved.'),'ok'); T.go('home'); };
});
window.TCS_UI.PEARLS=PEARLS; window.TCS_UI.LEIN=LEIN; window.TCS_UI.timelineHTML=timelineHTML;
})();
