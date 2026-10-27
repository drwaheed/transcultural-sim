/* Research measures: digital informed consent (participant information sheet + Agree/Decline, stored with timestamp)
   and the in-app Tool 1 Student Engagement Questionnaire (Kember, Leung & McNaught 2005; 35 items, 1–5) at T0/T1/T2.
   Cloud: tables consents / survey_responses (RLS: own rows; facilitators read all). Local fallback when cloud is off. */
(function(){
'use strict';
const T=window.TCS, U=window.TCS_UI, K=window.TCS_CON, L=(a,e)=>T.L(a,e), esc=T.esc;
const CL=()=>window.TCS_CLOUD, cloud=()=>!!(CL()&&CL().enabled&&CL().client&&CL().profile);
const CONSENT_VERSION='PIS-1.0 (2026-10)';
/* ---------- Tool 1: SEQ items, verbatim from the research file ---------- */
const SEQ_SCALES=[
 ['CT','Critical thinking','cap',['I have developed my ability to make judgements about alternative perspectives.','I have become more willing to consider different points of view.']],
 ['CR','Creative thinking','cap',['I have been encouraged to use my own initiative.','I have been challenged to come up with new ideas.']],
 ['SM','Self-managed learning','cap',['I feel that I can take responsibility for my own learning.','I have become more confident of my ability to pursue further learning.']],
 ['AD','Adaptability','cap',['During my time at university, I have learnt how to be more adaptable.','I have become more willing to change my views and accept new ideas.']],
 ['PS','Problem solving','cap',['I have improved my ability to use knowledge to solve problems in my field of study.','I am able to bring information and different ideas together to solve problems.']],
 ['CS','Communication skills','cap',['I have developed my ability to communicate effectively with others.','In my time at university I have improved my ability to convey ideas.']],
 ['IG','Interpersonal skills and groupwork','cap',['I have learnt to become an effective team or group member.','I feel confident in dealing with a wide range of people.']],
 ['CL','Computer literacy','cap',['I feel confident in using computer applications when necessary.','I have learnt more about using computers for presenting information.']],
 ['AL','Active learning','env',['Our teaching staff use a variety of teaching methods.','Students are given the chance to participate in classes.']],
 ['TU','Teaching for understanding','env',['The teaching staff try hard to help us understand the course material.','The course design helps students understand the course content.']],
 ['FB','Feedback to assist learning','env',['When I have difficulty with learning materials, I find the explanations provided by the teaching staff useful.','There is sufficient feedback on activities and assignments to ensure that we learn from the work we do.']],
 ['AS','Assessment','env',['The program uses a variety of assessment methods.','To do well in assessment in this program you need to have good analytical skills.','The assessment tested our understanding of key concepts in this program.']],
 ['TS','Relationship between teachers and students','env',['The communication between teaching staff and students is good.','I find teaching staff helpful when asked questions.']],
 ['WL','Workload','env',['I manage to complete the requirements of the program without feeling unduly stressed.','The amount of work we are expected to do is quite reasonable.']],
 ['RS','Relationship with other students','env',['I feel a strong sense of belonging to my class group.','I frequently work together with others in my classes.']],
 ['CO','Cooperative learning','env',['I have frequently discussed ideas from courses with other students out-of-class.','I have found that discussing course material with other students outside classes has helped me to reach a better understanding of the material.']],
 ['CH','Coherence of curriculum','env',['I can see how courses fitted together to make a coherent program of study for my major.','The program of study for my major was well integrated.']]];
/* Arabic = translation aid only (English wording above is the original instrument) */
const SEQ_AR=["طوّرتُ قدرتي على إصدار أحكام بشأن وجهات النظر البديلة.", "أصبحتُ أكثر استعداداً للنظر في وجهات النظر المختلفة.", "شُجِّعتُ على استخدام مبادرتي الذاتية.", "وُضِعتُ أمام تحدّي ابتكار أفكار جديدة.", "أشعر بأنني قادر على تحمّل مسؤولية تعلّمي.", "أصبحتُ أكثر ثقةً بقدرتي على مواصلة التعلّم مستقبلاً.", "تعلّمتُ خلال دراستي الجامعية كيف أكون أكثر قدرةً على التكيّف.", "أصبحتُ أكثر استعداداً لتغيير آرائي وتقبّل الأفكار الجديدة.", "حسّنتُ قدرتي على توظيف المعرفة في حل المشكلات في مجال دراستي.", "أستطيع الجمع بين المعلومات والأفكار المختلفة لحل المشكلات.", "طوّرتُ قدرتي على التواصل الفعّال مع الآخرين.", "حسّنتُ خلال دراستي الجامعية قدرتي على إيصال الأفكار.", "تعلّمتُ أن أكون عضواً فاعلاً في الفريق أو المجموعة.", "أشعر بالثقة في التعامل مع طيف واسع من الناس.", "أشعر بالثقة في استخدام تطبيقات الحاسوب عند الحاجة.", "تعلّمتُ المزيد عن استخدام الحاسوب في عرض المعلومات.", "يستخدم أعضاء هيئة التدريس لدينا طرائق تدريس متنوعة.", "تُتاح للطلبة فرصة المشاركة في المحاضرات.", "يبذل أعضاء هيئة التدريس جهداً كبيراً لمساعدتنا على فهم المادة الدراسية.", "يساعد تصميم المقرر الطلبةَ على فهم محتواه.", "عندما أواجه صعوبة في المواد التعليمية، أجد الشروح التي يقدّمها أعضاء هيئة التدريس مفيدة.", "توجد تغذية راجعة كافية على الأنشطة والواجبات تضمن تعلّمنا من العمل الذي نؤدّيه.", "يستخدم البرنامج أساليب تقييم متنوعة.", "للأداء الجيد في التقييم في هذا البرنامج تحتاج إلى مهارات تحليلية جيدة.", "قاس التقييمُ فهمَنا للمفاهيم الأساسية في هذا البرنامج.", "التواصل بين أعضاء هيئة التدريس والطلبة جيد.", "أجد أعضاء هيئة التدريس متعاونين عند طرح الأسئلة عليهم.", "أتمكّن من إنجاز متطلبات البرنامج دون الشعور بضغط مفرط.", "مقدار العمل المتوقَّع منّا معقول إلى حدّ كبير.", "أشعر بانتماء قوي إلى مجموعتي الصفية.", "أعمل كثيراً مع زملائي في المقررات.", "كثيراً ما ناقشتُ أفكار المقررات مع طلبة آخرين خارج قاعة الدرس.", "وجدتُ أن مناقشة المادة الدراسية مع طلبة آخرين خارج المحاضرات ساعدتني على فهمها فهماً أفضل.", "أستطيع أن أرى كيف تكاملت المقررات لتشكّل برنامجاً دراسياً مترابطاً في تخصصي.", "كان البرنامج الدراسي لتخصصي متكاملاً بشكل جيد."];
const SEQ_SCALE_AR={"CT": "التفكير الناقد", "CR": "التفكير الإبداعي", "SM": "التعلّم الذاتي", "AD": "القدرة على التكيّف", "PS": "حل المشكلات", "CS": "مهارات التواصل", "IG": "المهارات الشخصية والعمل الجماعي", "CL": "الثقافة الحاسوبية", "AL": "التعلّم النشط", "TU": "التدريس من أجل الفهم", "FB": "التغذية الراجعة الداعمة للتعلّم", "AS": "التقييم", "TS": "العلاقة بين المدرّسين والطلبة", "WL": "عبء العمل", "RS": "العلاقة مع الطلبة الآخرين", "CO": "التعلّم التعاوني", "CH": "ترابط المنهج"};
const SEQ=[]; SEQ_SCALES.forEach(([id,name,grp,items])=>items.forEach(t=>SEQ.push({n:SEQ.length+1,scale:id,scaleName:name,grp,t,ar:SEQ_AR[SEQ.length]})));
const ANCH=()=>[[1,L('لا أوافق بشدة','Strongly disagree')],[2,L('لا أوافق','Disagree')],[3,L('فقط إن تعذّرت إجابة محددة','Only if a definite answer is not possible')],[4,L('أوافق','Agree')],[5,L('أوافق بشدة','Strongly agree')]];
function seqScore(items){ const v=k=>{ const x=items&&items[k]; return x>=1&&x<=5?+x:null; }; const mean=a=>{ a=a.filter(x=>x!=null); return a.length?a.reduce((s,x)=>s+x,0)/a.length:null; };
  const sub={}; SEQ_SCALES.forEach(([id])=>sub[id]=mean(SEQ.filter(i=>i.scale===id).map(i=>v(i.n))));
  return {mean:mean(SEQ.map(i=>v(i.n))),cap:mean(SEQ.filter(i=>i.grp==='cap').map(i=>v(i.n))),env:mean(SEQ.filter(i=>i.grp==='env').map(i=>v(i.n))),sub,answered:SEQ.filter(i=>v(i.n)!=null).length}; }
const M={SEQ,SEQ_SCALES,seqScore,CONSENT_VERSION}; window.TCS_MEASURES=M;
/* ---------- state ---------- */
const st={consent:undefined,surveys:{},loadedFor:null};
const myCode=()=>{ const C=CL(); return (C&&C.profile&&C.profile.student_code)||sessionStorage.getItem('tcs.stu')||''; };
const isStudent=()=>cloud()?CL().profile.role!=='facilitator':!T.isFac()&&!!myCode();
const LKEY=(c,tp)=>'tcs.seq.'+c+'.'+tp, CKEY=c=>'tcs.consent.'+c;
async function loadMine(force){ const c=myCode(); if(!c) return; if(st.loadedFor===c&&!force) return;
  if(cloud()){ const sb=CL().client;
    const a=await sb.from('consents').select('*').eq('student_code',c).order('at',{ascending:false}).limit(1); if(a.error) throw a.error; st.consent=a.data[0]||null;
    const b=await sb.from('survey_responses').select('*').eq('student_code',c); if(b.error) throw b.error; st.surveys={}; b.data.forEach(r=>st.surveys[r.timepoint]=r);
    ['T0','T1','T2'].forEach(tp=>{ try{ const loc=JSON.parse(localStorage.getItem(LKEY(c,tp))||'null'); if(loc&&!(st.surveys[tp]&&st.surveys[tp].completed)&&Object.keys(loc.items||{}).length>Object.keys((st.surveys[tp]||{}).items||{}).length) st.surveys[tp]=Object.assign({},st.surveys[tp]||{},{items:loc.items,_local:true}); }catch(e){} });
  } else { try{ st.consent=JSON.parse(localStorage.getItem(CKEY(c))||'null'); }catch(e){ st.consent=null; } st.surveys={}; ['T0','T1','T2'].forEach(tp=>{ try{ const r=JSON.parse(localStorage.getItem(LKEY(c,tp))||'null'); if(r) st.surveys[tp]=r; }catch(e){} }); }
  st.loadedFor=c; }
M.state=st; M.loadMine=loadMine;
async function recordConsent(decision,ai){ const c=myCode();
  if(cloud()){ const r=await CL().client.rpc('record_consent',{p_decision:decision,p_ai:!!ai,p_version:CONSENT_VERSION}); if(r.error) throw r.error; st.consent=r.data; CL().profile.consent=decision==='agree'; }
  else { st.consent={student_code:c,decision,ai_logs:!!ai,version:CONSENT_VERSION,at:new Date().toISOString()}; localStorage.setItem(CKEY(c),JSON.stringify(st.consent)); const s=T.db.roster.students.find(x=>x.code===c); if(s){ s.consent=decision==='agree'; T.save(true); } } }
async function saveSurvey(tp,items,complete,sessionId){ const c=myCode(); const n=Object.values(items).filter(v=>v>=1&&v<=5).length; const now=new Date().toISOString();
  const row={student_code:c,timepoint:tp,instrument:'SEQ',items,n_answered:n,completed:!!complete,updated_at:now,session_id:sessionId||null}; if(complete) row.submitted_at=now;
  localStorage.setItem(LKEY(c,tp),JSON.stringify(row));
  if(cloud()){ row.user_id=CL().user.id; const r=await CL().client.from('survey_responses').upsert(row,{onConflict:'student_code,timepoint,instrument'}).select().single(); if(r.error) throw r.error; st.surveys[tp]=r.data; if(complete) localStorage.removeItem(LKEY(c,tp)); }
  else { st.surveys[tp]=row; if(complete){ const sc=seqScore(items); T.db.external=T.db.external.filter(x=>!(x.student===c&&x.timepoint===tp&&/^Tool1 SEQ/.test(x.measure))); T.db.external.push({student:c,timepoint:tp,measure:'Tool1 SEQ mean',value:+sc.mean.toFixed(3),auto:true}); T.save(true); } }
  return st.surveys[tp]; }
/* ---------- consent page ---------- */
const PIS=()=>[
 [L('عنوان الدراسة','Study title'),'Agentic AI-Powered Transcultural Clinical Simulation to Enhance Fourth-Year Nursing Students’ Learning Engagement (NUR416, University of Bahrain).'],
 [L('الهدف','Purpose'),L('تقييم مدى تعزيز المحاكاة السريرية عبر الثقافية المدعومة بالذكاء الاصطناعي الوكيلي لانخراطك في التعلم عبر دورتين من البحث الإجرائي.','To evaluate how far an agentic AI-powered transcultural clinical simulation enhances your learning engagement across two action-research cycles.')],
 [L('ماذا تتضمن المشاركة','What taking part involves'),L('إكمال استبانة الانخراط (الأداة 1، 35 بنداً، نحو 10 دقائق) عند T0 وT1 وT2؛ وملاحظة الميسّر لانخراطك (الأداة 2)؛ واستخدام سجلات التفاعل المجهّلة مع المريض الافتراضي.','Completing the engagement questionnaire (Tool 1, 35 items, about 10 minutes) at T0, T1 and T2; facilitator observation of engagement (Tool 2); and use of your anonymised interaction logs with the virtual patient.')],
 [L('المشاركة طوعية','Participation is voluntary'),L('رفض المشاركة أو الانسحاب لا يؤثر على درجاتك أو تقييمك أو وصولك إلى أي نشاط تعليمي. المحاكاة متاحة للجميع؛ تُدرج في البحث بيانات الموافقين فقط.','Declining or withdrawing has no effect on your grades, assessment or access to any teaching activity. The simulation is available to everyone; only data from consenting students enter the research dataset.')],
 [L('الحياد وتقليل الضغط','Neutral administration'),L('لأن الباحث هو مدرّس المقرر، يدير زميل محايد عملية الموافقة، ولا يرى الباحث القرارات الفردية إلا بعد رصد الدرجات.','Because the researcher is also the course instructor, a neutral colleague manages consent; individual decisions are not used in any grading.')],
 [L('السرية','Confidentiality'),L('تُخزّن البيانات برموز مجهّلة (مثل S07) دون أسماء، وتُحفظ بأمان، وتُنشر النتائج مجمّعة ومجهّلة فقط. لا تُدخل أي بيانات تعريفية في نظام الذكاء الاصطناعي.','Data are stored under anonymised codes (e.g., S07) without names, kept securely, and reported only in aggregated, anonymised form. No identifying data are entered into the AI system.')],
 [L('الذكاء الاصطناعي','About the AI'),L('ستتفاعل مع مريض افتراضي مولَّد بالذكاء الاصطناعي قد يخطئ؛ لا تحلّ مخرجاته محل الحكم الأكاديمي أو السريري، ولا تُستخدم سجلاته في الدرجات الختامية.','You will interact with an AI-generated virtual patient that may make mistakes; its output does not replace academic or clinical judgement, and its logs are not used for summative grading.')],
 [L('الانسحاب','Withdrawal'),L('يمكنك تغيير قرارك في أي وقت من «بوابة الطالب» حتى إغلاق مجموعة البيانات بعد رصد درجات المقرر.','You can change your decision at any time from the Student hub until the dataset is closed after course grades are finalised.')]];
function consentView(main,next){ const cur=st.consent;
  main.innerHTML='<div class="consent-wrap"><h1>📝 '+L('نموذج الموافقة المستنيرة','Informed consent')+'</h1>'+
   (cur?'<div class="alert '+(cur.decision==='agree'?'ok':'warn')+'" role="status">'+(cur.decision==='agree'?L('قرارك الحالي: موافق على المشاركة','Your current decision: you agreed to take part'):L('قرارك الحالي: لا ترغب في المشاركة','Your current decision: you declined'))+' · '+T.fmtDate(cur.at)+'</div>':'<p class="lead">'+L('قبل المتابعة، اقرأ معلومات المشارك واختر قرارك. يستغرق ذلك دقيقتين.','Before you continue, please read the participant information and choose. It takes about two minutes.')+'</p>')+
   '<section class="card" aria-labelledby="pisH"><h2 id="pisH" class="h3">'+L('معلومات المشارك','Participant information sheet')+' <span class="badge">'+CONSENT_VERSION+'</span></h2><dl class="pis">'+PIS().map(x=>'<dt>'+x[0]+'</dt><dd>'+esc(x[1])+'</dd>').join('')+'</dl></section>'+
   '<form id="cf" class="card" novalidate><h2 class="h3">'+L('قرارك','Your decision')+'</h2>'+
   '<label class="choice"><input type="checkbox" name="read" required '+(cur?'checked':'')+'><span>'+L('قرأت معلومات المشارك وفهمتها، وأتيحت لي فرصة طرح الأسئلة.','I have read and understood the participant information and have had the chance to ask questions.')+'</span></label>'+
   '<label class="choice"><input type="checkbox" name="ai" '+(cur&&cur.ai_logs?'checked':(!cur?'checked':''))+'><span>'+L('أوافق على تحليل سجلات تفاعلي المجهّلة مع المريض الافتراضي.','I agree that my anonymised interaction logs with the virtual patient may be analysed.')+'</span></label>'+
   '<div id="cErr" role="alert" class="err small"></div><div class="btn-row consent-btns"><button type="submit" class="btn btn-primary btn-lg" id="cAgree" value="agree">✅ '+L('أوافق على المشاركة','I agree to take part')+'</button><button type="button" class="btn btn-secondary btn-lg" id="cDecline">'+L('لا أرغب في المشاركة','I do not wish to take part')+'</button></div>'+
   '<p class="xs muted">'+L('يُسجَّل قرارك مع الوقت والتاريخ. يمكنك تغييره لاحقاً من بوابة الطالب.','Your decision is recorded with the date and time. You can change it later from the Student hub.')+'</p></form></div>';
  const f=main.querySelector('#cf'), err=main.querySelector('#cErr');
  const go=async decision=>{ err.textContent=''; if(decision==='agree'&&!f.read.checked){ err.textContent=L('يُرجى تأكيد أنك قرأت معلومات المشارك.','Please confirm that you have read the participant information.'); f.read.focus(); return; }
    const bs=f.querySelectorAll('button'); bs.forEach(b=>b.disabled=true);
    try{ await recordConsent(decision,decision==='agree'&&f.ai.checked); T.toast(decision==='agree'?L('شكراً، سُجّلت موافقتك.','Thank you — your consent is recorded.'):L('سُجّل قرارك. يمكنك متابعة كل الأنشطة التعليمية.','Decision recorded. You can still use every learning activity.'),'ok');
      location.hash=next||'#hub'; T.render(); }
    catch(x){ err.textContent=L('تعذّر الحفظ: ','Could not save: ')+x.message+' — '+L('تحقق من الاتصال وحاول مجدداً.','check the connection and try again.'); bs.forEach(b=>b.disabled=false); } };
  f.onsubmit=e=>{ e.preventDefault(); go('agree'); }; main.querySelector('#cDecline').onclick=async()=>{ if(await T.confirmDlg(L('عدم المشاركة؟','Decline participation?'),L('لن تُدرج بياناتك في البحث. لن يؤثر ذلك على درجاتك أو وصولك إلى الأنشطة.','Your data will not be included in the research. This does not affect your grades or access to activities.'),L('تأكيد عدم المشاركة','Confirm decline'))) go('decline'); }; }
/* ---------- Tool 1 questionnaire ---------- */
function tpLabel(tp){ return {T0:L('T0 — خط الأساس','T0 — baseline'),T1:L('T1 — بعد الدورة 1','T1 — after Cycle 1'),T2:L('T2 — بعد الدورة 2','T2 — after Cycle 2')}[tp]||tp; }
function surveyView(main,tp,sid){ tp=String(tp||'T1').toUpperCase(); if(!/^T[0-2]$/.test(tp)) tp='T1';
  const c=myCode(); if(!c){ main.innerHTML='<h1>'+L('الاستبانة','Questionnaire')+'</h1><div class="alert warn">'+L('سجّل الدخول بحساب طالب لإكمال الاستبانة.','Sign in with a student account to complete the questionnaire.')+'</div>'; return; }
  const con=st.consent; if(!con||con.decision!=='agree'){ main.innerHTML='<h1>📋 '+L('استبانة الانخراط','Engagement questionnaire')+' '+tp+'</h1><div class="card"><p>'+(con?L('اخترت عدم المشاركة في البحث، لذلك لا تُجمع إجاباتك. يمكنك تغيير قرارك في أي وقت.','You chose not to take part in the research, so your answers are not collected. You can change your decision at any time.'):L('قبل الاستبانة، يُرجى قراءة نموذج الموافقة المستنيرة واختيار قرارك.','Before the questionnaire, please read the informed consent form and choose your decision.'))+'</p><a class="btn btn-primary" href="#consent">'+(con?L('مراجعة قراري','Review my decision'):L('فتح نموذج الموافقة','Open the consent form'))+'</a> <a class="btn btn-ghost" href="#hub">'+L('بوابة الطالب','Student hub')+'</a></div>'; return; }
  const ex=st.surveys[tp]||{}; const items=Object.assign({},ex.items||{}); const done=!!ex.completed;
  const A=ANCH(); let lastScale='';
  const rows=SEQ.map(i=>{ const h=i.scale!==lastScale?'<h3 class="seq-scale"><span lang="en" class="ltr">'+esc(i.scaleName)+'</span> · <span lang="ar">'+esc(SEQ_SCALE_AR[i.scale]||'')+'</span></h3>':''; lastScale=i.scale;
    return h+'<fieldset class="lk" id="q'+i.n+'"'+(done?' disabled':'')+'><legend><span class="lk-n">'+i.n+'</span> <span class="ltr" lang="en">'+esc(i.t)+'</span><span class="seq-ar" lang="ar" dir="rtl"><span class="seq-ar-tag">'+L('ترجمة مساعدة','Arabic aid')+'</span> '+esc(i.ar||'')+'</span></legend><div class="lk-opts">'+A.map(([v,lab])=>'<label class="lk-o"><input type="radio" name="q'+i.n+'" value="'+v+'"'+(items[i.n]==v?' checked':'')+' required><span><b>'+v+'</b><small>'+lab+'</small></span></label>').join('')+'</div></fieldset>'; }).join('');
  main.innerHTML=(sid?U.steps(5):'')+'<h1>📋 '+L('الأداة 1: استبانة انخراط الطالب','Tool 1: Student Engagement Questionnaire')+'</h1>'+
   '<p class="small"><span class="badge pri">'+tpLabel(tp)+'</span> <span class="badge">'+L('الرمز ','Code ')+esc(c)+'</span> '+(done?'<span class="badge ok">✓ '+L('أُرسلت ','Submitted ')+T.fmtDate(ex.submitted_at)+'</span>':'')+'</p>'+
   '<div class="card seq-intro"><p>'+L('حدّد مدى موافقتك على كل عبارة. اختر الإجابة الأنسب لكل سؤال. استخدم 3 فقط إن تعذّرت إجابة محددة. تُحفظ إجاباتك تلقائياً كمسودة.','Please indicate your level of agreement with each statement and choose the one most appropriate response. Use 3 only if a definite answer is not possible. Your answers are saved automatically as a draft.')+'</p><p class="small">🌐 '+L('النص الإنجليزي هو الصيغة الأصلية المعتمدة للأداة؛ الترجمة العربية أسفل كل بند مساعدة على الفهم فقط. أجب وفق المعنى الإنجليزي.','The English wording is the original, validated instrument; the Arabic under each item is a translation aid only. Answer according to the English meaning.')+'</p><p class="xs muted">© 2005 David Kember, Doris Y. P. Leung and Carmel McNaught · 35 '+L('بنداً','items')+' · 17 '+L('مقياساً فرعياً','subscales')+'</p></div>'+
   '<div class="seq-progress" role="status" aria-live="polite"><div class="bar"><span id="sqBar"></span></div><span id="sqTxt"></span></div>'+
   '<form id="sq" novalidate>'+rows+'<div id="sqErr" role="alert" class="err"></div><div class="btn-row">'+(done?'<a class="btn btn-primary btn-lg" href="'+(sid?'#measure/'+sid:'#hub')+'">'+L('رجوع','Back')+'</a>':'<button type="submit" class="btn btn-primary btn-lg">'+L('إرسال الاستبانة','Submit questionnaire')+'</button>')+'</div></form>';
  const f=main.querySelector('#sq'); const prog=()=>{ const n=SEQ.filter(i=>items[i.n]).length; main.querySelector('#sqBar').style.width=(100*n/SEQ.length)+'%'; main.querySelector('#sqTxt').textContent=n+' / '+SEQ.length+' '+L('بنداً مجاباً','answered'); };
  prog(); if(done) return;
  let t=null, saving=Promise.resolve();
  const draft=()=>{ clearTimeout(t); t=setTimeout(()=>{ saving=saveSurvey(tp,items,false,sid).catch(e=>{ main.querySelector('#sqErr').textContent=L('حُفظت المسودة على هذا الجهاز فقط (لا اتصال): ','Draft kept on this device only (offline): ')+e.message; }); },900); };
  f.addEventListener('change',e=>{ const m=e.target.name&&e.target.name.match(/^q(\d+)$/); if(!m) return; items[m[1]]=+e.target.value; e.target.closest('fieldset').classList.remove('missing'); prog(); draft(); });
  f.onsubmit=async e=>{ e.preventDefault(); const err=main.querySelector('#sqErr'); err.textContent=''; const miss=SEQ.filter(i=>!items[i.n]);
    if(miss.length){ miss.forEach(i=>main.querySelector('#q'+i.n).classList.add('missing')); err.textContent=L('لم تُجب عن ','Unanswered: ')+miss.length+L(' بنداً (أولها رقم ',' item(s), first is #')+miss[0].n+')'; const fs=main.querySelector('#q'+miss[0].n); fs.scrollIntoView({block:'center'}); fs.querySelector('input').focus(); return; }
    const b=f.querySelector('button[type=submit]'); b.disabled=true; b.textContent=L('جارٍ الإرسال…','Submitting…'); clearTimeout(t);
    try{ await saving; await saveSurvey(tp,items,true,sid); T.toast(L('شكراً! أُرسلت الاستبانة.','Thank you! Questionnaire submitted.'),'ok'); surveyView(main,tp,sid); window.scrollTo(0,0); }
    catch(x){ err.textContent=L('تعذّر الإرسال: ','Could not submit: ')+x.message+' — '+L('إجاباتك محفوظة على هذا الجهاز؛ حاول مجدداً.','your answers are kept on this device; please try again.'); b.disabled=false; b.textContent=L('إرسال الاستبانة','Submit questionnaire'); } }; }
/* ---------- hub card ---------- */
function hubCard(){ const con=st.consent; const tps=['T0','T1','T2'];
  return '<section class="card measures-card" aria-labelledby="msH"><h2 id="msH" class="h3">📋 '+L('الاستبانات البحثية والموافقة','Research questionnaires & consent')+'</h2>'+
   '<p class="small">'+L('الموافقة: ','Consent: ')+(con?(con.decision==='agree'?'<span class="badge ok">✓ '+L('موافق','agreed')+'</span>':'<span class="badge warn">'+L('غير مشارك','declined')+'</span>')+' <span class="xs muted">'+T.fmtDate(con.at)+'</span>':'<span class="badge danger">'+L('لم تُحدَّد بعد','not decided')+'</span>')+' · <a href="#consent">'+(con?L('مراجعة/تغيير','review / change'):L('فتح نموذج الموافقة','open consent form'))+'</a></p>'+
   (con&&con.decision==='agree'?'<div class="btn-row">'+tps.map(tp=>{ const s=st.surveys[tp]; return '<a class="btn '+(s&&s.completed?'btn-ghost':'btn-secondary')+'" href="#survey/'+tp+'">'+(s&&s.completed?'✓ ':s?'✎ ':'')+tpLabel(tp)+'</a>'; }).join('')+'</div>':'')+'</section>'; }
/* ---------- measurement step (replaces the text-only version) ---------- */
T.route('measure',(main,id)=>{
  const S=U.cur(id); if(!S) return U.notFound(main); const tp=S.mode==='research'?(S.cycle===1?'T1':'T2'):'T1';
  const obsDone=T.db.obs.filter(o=>o.sessionId===S.id).length, fac=T.isFac(), c=myCode(), con=st.consent, sv=st.surveys[tp];
  const url=location.href.split('#')[0]+'#survey/'+tp;
  const stuCard=fac?'<div class="card"><h2>'+L('للطلبة: الأداة 1','For students: Tool 1')+'</h2><p>'+L('يُكمل كل طالب الاستبانة من حسابه (هاتفه أو هذا الجهاز) عبر: بوابة الطالب ← الاستبانات البحثية، أو الرابط:','Each student completes the questionnaire from their own account (phone or this device): Student hub → Research questionnaires, or the link:')+'</p><p class="ltr mono small">'+esc(url)+'</p><p class="small">'+L('تابع نسبة الإكمال في لوحة الميسّر ← التقييم.','Track completion in the Facilitator Console → Assessment.')+'</p></div>'
   :'<div class="card measure-stu"><h2>'+L('للطلبة: الأداة 1 — ','For students: Tool 1 — ')+tp+'</h2>'+
    (!con?'<p>'+L('أولاً: نموذج الموافقة المستنيرة.','First: the informed consent form.')+'</p><a class="btn btn-primary btn-lg" href="#consent">📝 '+L('فتح نموذج الموافقة','Open consent form')+'</a>'
     :con.decision!=='agree'?'<p>'+L('اخترت عدم المشاركة؛ لا يلزمك إكمال الاستبانة.','You declined participation; no questionnaire is needed.')+' <a href="#consent">'+L('تغيير القرار','Change decision')+'</a></p>'
     :sv&&sv.completed?'<p class="alert ok">✓ '+L('أرسلت استبانة ','You submitted ')+tp+' · '+T.fmtDate(sv.submitted_at)+'</p>'
     :'<p>'+L('35 بنداً، نحو 10 دقائق، مقياس 1–5.','35 items, about 10 minutes, 1–5 scale.')+(sv?' <span class="badge">'+L('مسودة: ','Draft: ')+(sv.n_answered||Object.keys(sv.items||{}).length)+'/35</span>':'')+'</p><a class="btn btn-primary btn-lg" href="#survey/'+tp+'/'+S.id+'">📋 '+(sv?L('متابعة الاستبانة','Continue questionnaire'):L('ابدأ الاستبانة الآن','Start the questionnaire now'))+'</a>')+
    '<p class="small" style="margin-top:var(--s3)">'+L('زملاء الفريق: سجّلوا الدخول بحساباتكم على هواتفكم، ثم افتحوا: ','Team-mates: sign in with your own account on your phone, then open: ')+'<span class="ltr mono">'+esc(url)+'</span></p>'+
    '<p class="xs muted">'+(S.cycle===1?L('ثم الاختبار 1 وفق جدول المقرر.','Then Test 1 as scheduled in the course.'):L('ثم الاختبار 2 وفق جدول المقرر.','Then Test 2 as scheduled in the course.'))+'</p></div>';
  main.innerHTML=U.steps(5)+'<h1>'+L('القياس','Measurement')+' '+tp+'</h1>'+
   '<div class="grid g2">'+stuCard+
   '<div class="card"><h2>'+L('للميسّر: الأداة 2','For the facilitator: Tool 2')+'</h2><p>'+L('سجّل ملاحظة الانخراط لكل طالب (18 بنداً + 6 بنود مضافة). سُجّلت: ','Record the engagement observation for each student (18 items + 6 added items). Recorded: ')+'<b>'+obsDone+'/'+S.members.length+'</b></p><a class="btn btn-primary" href="#fac/obs/'+S.id+'">👁 '+L('فتح نموذج الملاحظة','Open observation form')+'</a></div></div>'+
   '<p class="small muted">'+L('مواد التعلم بعد الجلسة تُفتح بعد القياس بالطريقة نفسها في الدورتين.','Post-session learning opens after measurement in the same way in both cycles.')+'</p>'+
   '<div class="btn-row" style="margin-top:var(--s4)"><button class="btn btn-primary btn-lg wrap" id="toExtras">'+L('اكتمل القياس — فتح مواد ما بعد الجلسة','Measurement complete — open post-session learning')+'</button></div>';
  main.querySelector('#toExtras').onclick=async()=>{ if(!fac&&c&&con&&con.decision==='agree'&&!(sv&&sv.completed)&&!(await T.confirmDlg(L('لم تُرسل الاستبانة','Questionnaire not submitted'),L('لم تُرسل استبانة الأداة 1 بعد. هل تريد المتابعة على أي حال؟ يمكنك إكمالها لاحقاً من بوابة الطالب.','You have not submitted Tool 1 yet. Continue anyway? You can complete it later from the Student hub.'),L('متابعة','Continue')))) return;
    S.measure={done:true,at:new Date().toISOString(),timepoint:tp}; S.status='extras'; T.save(true); T.go('extras/'+S.id); };
});
T.route('consent',main=>{ const nx=sessionStorage.getItem('tcs.consentNext'); sessionStorage.removeItem('tcs.consentNext'); consentView(main,nx); });
T.route('survey',(main,tp,sid)=>surveyView(main,tp,sid));
/* ---------- gate: consent at the start for students; hub card ---------- */
const render0=T.render;
T.render=function(){ document.querySelectorAll('.fac-obs-fab').forEach(x=>x.remove()); const main=document.getElementById('main'); const h=(location.hash||'#home').slice(1).split('/')[0];
  if(document.querySelector('#lf,#pf')||!main){ return render0.apply(T,arguments); }
  const C0=CL(); if(T.isFac()&&(!C0||!C0.enabled||C0.profile)){ applyConsent(); const r=render0.apply(T,arguments); fab(h); return r; }
  const C=CL(); const signed=C&&C.enabled?!!(C.profile&&!C.profile.must_change_password):true;
  if(!signed||!isStudent()) return render0.apply(T,arguments);
  if(st.loadedFor!==myCode()){ main.innerHTML='<p class="muted" role="status">'+L('جارٍ التحميل…','Loading…')+'</p>'; loadMine().catch(e=>{ console.warn('measures',e); st.loadedFor=myCode(); st.consent=st.consent||null; }).then(()=>T.render()); return; }
  if(cloud()&&st.consent===null&&!['consent','account','help'].includes(h)&&!sessionStorage.getItem('tcs.consentAsked')){ sessionStorage.setItem('tcs.consentAsked','1'); sessionStorage.setItem('tcs.consentNext','#'+(location.hash||'#hub').slice(1)); location.replace('#consent'); return; } // shown once per sign-in, never blocks
  render0.apply(T,arguments);
  if(h==='hub'&&myCode()){ const t=main.querySelector('h1'); if(t&&!main.querySelector('.measures-card')) t.insertAdjacentHTML('afterend',hubCard()); }
};
function fab(h){ document.querySelectorAll('.fac-obs-fab').forEach(x=>x.remove()); const parts=(location.hash||'').slice(1).split('/');
  if(!['fac','measure','debrief','sim','console','extras'].includes(h)||(h==='fac'&&parts[1]==='obs')) return;
  const run=(T.db.sessions||[]).filter(s=>['running','paused','debrief','measure'].includes(s.status)).sort((a,b)=>(b.started||'').localeCompare(a.started||''))[0];
  const sid=h==='measure'||h==='debrief'||h==='sim'?parts[1]:(run&&run.id);
  const a=document.createElement('a'); a.className='btn btn-primary btn-lg fac-obs-fab no-print'; a.href='#fac/obs'+(sid?'/'+sid:''); a.innerHTML='👁 '+L('ملاحظة (الأداة 2)','Observe (Tool 2)'); document.body.appendChild(a); }
/* ---------- facilitator side: pull responses, merge Tool 1 scores into the T0/T1/T2 analysis, completion panel and item-level export ---------- */
const fx={surveys:[],consents:[]}; M.fac=fx;
function mergeScores(){ T.db.external=T.db.external.filter(x=>!x.autoSeq); fx.surveys.filter(r=>r.completed).forEach(r=>{ const sc=seqScore(r.items); [['Tool1 SEQ mean',sc.mean],['Tool1 SEQ capabilities',sc.cap],['Tool1 SEQ environment',sc.env]].forEach(([m,v])=>{ if(v!=null) T.db.external.push({student:r.student_code,timepoint:r.timepoint,measure:m,value:+v.toFixed(3),synced:true,autoSeq:true}); }); }); }
if(K&&K.load){ const load0=K.load; K.load=async function(){ const r=await load0.apply(K,arguments);
  try{ if(cloud()&&CL().isFacRole()){ const sb=CL().client; const a=await sb.from('survey_responses').select('*'); const b=await sb.from('consents').select('*').order('at',{ascending:false}); if(!a.error) fx.surveys=a.data; fx.consents=b.error?[]:b.data; fx.ready=true; mergeScores(); applyConsent(); } }catch(e){ console.warn('measures load',e); }
  return r; }; }
/* explicit-consent policy: only students whose latest recorded decision is 'agree' count as consented (undecided = excluded) */
function applyConsent(){ if(!fx.ready) return; (T.db.roster.students||[]).forEach(x=>{ const c=latestConsent(x.code); x.consent=!!(c&&c.decision==='agree'); x.consentState=c?c.decision:'undecided'; }); }
M.applyConsent=applyConsent;
const latestConsent=code=>fx.consents.find(c=>c.student_code===code);
M.facPanel=()=>{ const R=T.db.roster, n=R.students.length; const ag=R.students.filter(s=>{ const c=latestConsent(s.code); return c&&c.decision==='agree'; }).length, de=R.students.filter(s=>{ const c=latestConsent(s.code); return c&&c.decision==='decline'; }).length;
  const cnt=tp=>fx.surveys.filter(r=>r.timepoint===tp&&r.completed).length, dr=tp=>fx.surveys.filter(r=>r.timepoint===tp&&!r.completed).length;
  return '<section class="card" style="margin-top:var(--s4)" id="seqPanel"><h3>📋 '+L('الموافقة والأداة 1 داخل المنصة (SEQ)','Consent & in-app Tool 1 (SEQ)')+'</h3><div class="grid g4">'+
   [[ag+'/'+n,L('وافقوا','agreed')],[de,L('رفضوا','declined')],[n-ag-de,L('لم يقرروا بعد','not decided')]].map(k=>'<div class="card pad-sm kpi"><b>'+k[0]+'</b><span>'+k[1]+'</span></div>').join('')+'<div class="card pad-sm kpi"><b>'+['T0','T1','T2'].map(cnt).join(' · ')+'</b><span>'+L('أُرسلت T0 · T1 · T2','submitted T0 · T1 · T2')+' ('+L('مسودات ','drafts ')+['T0','T1','T2'].map(dr).join('/')+')</span></div></div>'+
   '<p class="xs muted">'+L('تشمل الصادرات البحثية فقط من كان آخر قرار له «موافق»؛ ويُستبعد غير المقررين حتى يوافقوا. متوسطات SEQ (1–5) تظهر تلقائياً في جدول مقارنات T0/T1/T2 أدناه وفي التصدير.','Research exports include only students whose latest decision is “agree”; undecided students are excluded until they agree. SEQ means (1–5) appear automatically in the T0/T1/T2 comparison table below and in the exports.')+'</p><div class="btn-row"><button class="btn btn-secondary" id="seqX">⬇ '+L('تصدير إجابات الأداة 1 (بنود)','Export Tool 1 responses (item level)')+'</button><button class="btn btn-secondary" id="conX">⬇ '+L('تصدير سجل الموافقات','Export consent log')+'</button></div></section>'; };
M.facWire=panel=>{ const day=new Date().toISOString().slice(0,10); const x=panel.querySelector('#seqX'); if(!x) return;
  x.onclick=()=>{ const head=['student_code','team_code','consent','timepoint','completed','submitted_at','n_answered','seq_mean','capabilities','environment',...SEQ_SCALES.map(s=>'sub_'+s[0]),...SEQ.map(i=>'q'+i.n)];
    const rows=fx.surveys.map(r=>{ const sc=seqScore(r.items), c=latestConsent(r.student_code); const f=v=>v==null?'':+v.toFixed(3); return [r.student_code,T.teamOf(r.student_code)||'',c?c.decision:'',r.timepoint,r.completed?1:0,r.submitted_at||'',r.n_answered,f(sc.mean),f(sc.cap),f(sc.env),...SEQ_SCALES.map(s=>f(sc.sub[s[0]])),...SEQ.map(i=>(r.items||{})[i.n]??'')]; });
    T.download('tool1-seq-responses-'+day+'.csv',T.toCSV([head,...rows]),'text/csv'); if(K.audit) K.audit('export','tool1-seq',{rows:rows.length}); };
  panel.querySelector('#conX').onclick=()=>{ T.download('consent-log-'+day+'.csv',T.toCSV([['student_code','decision','ai_logs','version','at'],...fx.consents.map(c=>[c.student_code,c.decision,c.ai_logs?1:0,c.version,c.at])]),'text/csv'); if(K.audit) K.audit('export','consent-log',{rows:fx.consents.length}); }; };
const F=window.TCS_FAC; if(F&&F.assess){ const a0=F.assess; F.assess=function(panel){ a0.apply(F,arguments); const first=panel.querySelector('.grid'); if(first) first.insertAdjacentHTML('afterend',M.facPanel()); M.facWire(panel); }; }
})();
