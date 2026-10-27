/* Agent architecture: Orchestrator (state machine, intent classification, reveal logic, routing, decision points, logging),
   Patient & Family agents (offline scripted / LLM), Facilitator-support, Debrief-support (Cycle 2), Analytics, Guardrail layer. */
(function(){
'use strict';
const T=window.TCS;
const RX={
  greet:/\b(hello|hi|hey|good (morning|afternoon|evening)|salam|assalam|as-salamu|marhaba|ahlan|peace be)\b/,
  intro:/\b(my name is|i am (a |the )?(nursing )?student|we are (nursing )?students|we're from|introduce|purpose of (our|the|this) visit|we came|here to (help|support|visit|assess))\b/,
  openStart:/^(what|how|tell me|could you tell|can you tell|would you tell|describe|why|in what way|who|when|where|which|help me understand|can you (share|describe|explain))\b/,
  openAny:/(tell me (more|about)|how do you feel|what do you think|how (do|did|does|would) you|what (does|do|did|would|is|are) .{0,30}(mean|like|usually|feel|think)|help me understand|what matters)/,
  closedStart:/^(do|did|are|is|have|has|can|will|would|were|was|does)\b/,
  empathy:/(that (sounds|must)|i (can )?understand|must (be|feel) (hard|difficult|tiring|stressful|scary|frightening)|(i'm|i am|we're|we are) sorry|thank you for (sharing|telling|trusting)|we respect|i hear you|it's (ok|okay) to|it is (ok|okay) to|no judg|without judg|we are here (to|for) (help|support|you)|take your time|i appreciate|you('re| are) doing (well|great|your best)|not your fault|you are not alone|you're not alone|how (are you|do you) (feel|feeling|coping)|we care|i can see (that|how)|your feelings)/,
  consent:/(is it (ok|okay|alright)|may (i|we)|do you mind|with your permission|permission|would you (like|prefer|be comfortable)|are you comfortable|if you (agree|are okay))/,
  judg:/(you must (?!be |feel |have been )|you have to (?!be )|you should(n't| not)? have|why didn't you|why did you (stop|not)|that'?s wrong|it is wrong|irresponsible|non-?complian|ignorant|superstiti|backward|nonsense|stupid|lazy|your fault|bad (mother|father|parent)|careless|primitive|that is not (true|real) medicine|unscientific)/,
  stereo:/(you people|in your culture( you| people)?|your culture (is|doesn'?t|does not)|all (arabs|muslims|asians|indians|bangladeshis|filipinos|migrants|expats|bahrainis|women|men) |these people|your kind|typical (of|for) (you|your|them)|people like you|(arabs|muslims|asians|migrants|expats) (always|never|don'?t))/,
  jargon:/(hba1c|hypoglyc|hyperglyc|antihypertens|non-?complian|adherence|regimen|glycemic|glycaemic|comorbid|prognosis|etiolog|aetiolog|pathophys|contraindicat|seroconver|immunogen|nephropath|retinopath|neuropath|dyslipid)/,
  init:/(interpreter|translator|refer(ral)?|social worker|dietitian|community (centre|center|resource)|follow[- ]?up|support group|schedule (a|another)|arrange|connect (you|her|him) with|safeguarding)/,
  pii:/([\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s-]{7,}\d|\b(cpr|passport|id)\s*(no\.?|number)?\s*[:#]?\s*\d{5,})/i,
  pause:/pause simulation/i,
  pos:/\b(thank|great|good|glad|happy|hope|wonderful|excellent|appreciate|kind|support|together|safe|welcome|respect|care)\w*/g,
  neg:/\b(bad|wrong|must|never|stupid|lazy|fault|danger|problem|blame|stop it|refuse)\w*/g
};
const GIGER={
  comm:{en:'Communication',ar:'التواصل',rx:/(language|understand|explain|interpret|translat|speak|english|arabic|words|simple|say it|tell you|communicat|call you|address you|prefer to be called|name)/},
  space:{en:'Space',ar:'المكان (الحيّز)',rx:/(comfortable|privacy|private|touch|sit|room|space|close|male (nurse|student)|female (nurse|student)|examin|personal space|distance|home safety|bathroom)/},
  social:{en:'Social organisation',ar:'التنظيم الاجتماعي',rx:/(family|husband|wife|daughter|son|children|decid|decision|who (helps|lives|makes)|community|mosque|imam|friend|neighbo|work|job|support|role|head of|relatives|council)/},
  time:{en:'Time',ar:'الزمن',rx:/(time|when|schedule|routine|prayer|asr|ramadan|fast|appointment|today|tomorrow|morning|evening|night|shift|weekend|friday|how long|soon)/},
  env:{en:'Environmental control',ar:'التحكم البيئي',rx:/(believe|belief|faith|god|allah|religio|herb|remed|traditional|healing|cause|why do you think|natural|control|cost|afford|money|service|clinic|access|health centre|insurance)/},
  bio:{en:'Biological variation',ar:'الاختلافات البيولوجية',rx:/(diet|food|eat|meal|iftar|suhoor|dates|rice|sugar|blood|genetic|sickle|skin|weight|allerg|pressure|medicin|tablet|symptom|dizz|sweat|pain|cough|breath|smok)/}
};
const DOMAINS=Object.keys(GIGER);
const LEAK={med_stop:/stopp?(ed)? (taking )?(my |the )?(tablets|medicines?|pills)/i,fasting_plan:/i (will|am going to) fast/i,herbal_mix:/(herb|mixture)/i,hypo_history:/(dizz|sweat|shak)/i,partial_disclosure:/(angry|scared when|when he drinks|hurts? me)/i,risk:/(threat|weapon)/i,hidden_cases:/(five|sixteen|\d+) (are |more )?(sick|ill)/i,raita:/(raita|yoghurt|yogurt).{0,40}(outside|hours|fridge)/i,grandson:/grandson/i,measles_brother:/(brother|sister) died/i,carer_strain:/(back hurts|my back)/i,maryam_worry:/(wake up at night|sleep badly)/i,hiding:/(don'?t check|skip).{0,20}(lunch|school)/i};
function lc(s){ return String(s||'').toLowerCase().replace(/[’`]/g,"'"); }
/* keywords that start with a letter are anchored at a word start ('eat' must not fire inside 'breathing', 'app' inside 'happy') */
const _rxC={}; function kwRx(k){ return _rxC[k]||(_rxC[k]=new RegExp((/^[a-z]/i.test(k)?'\\b':'')+k,'i')); }
function anyRx(list, text){ let n=0; for(const k of (list||[])){ try{ if(kwRx(k).test(text)) n++; }catch(e){ if(text.includes(k)) n++; } } return n; }
function matchLen(list,text){ let m=0; for(const k of (list||[])){ try{ const r=kwRx(k).exec(text); if(r) m=Math.max(m,r[0].length); }catch(e){} } return m; }
/* Normaliser: common typos + English synonyms + Arabic → canonical English concept words (appended, never shown) */
const TYPO=[[/\bwich\b/g,'which'],[/\bfell\b/g,'feel'],[/\bfin[ia]n[ct]ial\b/g,'financial'],[/\bmed[ei]cin(e|es)?\b/g,'medicine'],[/\bpres+ure\b/g,'pressure'],[/\bdiab[ei]t[ie]?s\b/g,'diabetes'],[/\bur\b/g,'your'],[/\bu\b/g,'you'],[/\bplz\b/g,'please'],[/\basses\b/g,'assess'],[/\bsympto?ms?\b/g,'symptoms'],[/\bsings\b/g,'signs'],[/\bchild(ren)?s\b/g,'children']];
const LEX=[
 [/(\b(the|ur|your|ma|his|her) (son|boy|kid|child)\b|\b(son|boy|kid|child)\b|ابن|ولد|طفل|الصغير)/,'your son child'],
 [/(\bdaughter\b|\bgirl\b|بنت|ابنت)/,'your daughter'],
 [/(\bsick\b|\bill(ness)?\b|unwell|not well|symptom|مريض|مرض|تعبان|اعراض|أعراض)/,'sick symptoms'],
 [/(since when|how long|for how long|منذ متى|من امتى|من متى)/,'how long since when'],
 [/(\b(relieve|reliev|soothe|manage) |what do you do (for|when|to help)|home remed|بتعملي ايه|تعالج)/,'remedies what do you do for'],
 [/(\b(money|cost|costs|expens|income|salary|financial|material problem|pay for)|مال|فلوس|مادي|تكلف|دخل)/,'money financ afford cost'],
 [/(دواء|ادوية|أدوية|علاج|حبوب)/,'medicine tablets'],
 [/(ضغط)/,'blood pressure'],[/(سكر)/,'sugar diabetes'],[/(تدخين|سجائر|يدخن|سيجار)/,'smoking'],
 [/(السلام|سلام عليكم|مرحبا|أهلا|اهلا|صباح الخير|مساء الخير)/,'assalam hello'],
 [/(كيف حالك|كيفك|ازيك|إزيك|عامل ايه|كيف الحال)/,'how are you'],
 [/(\btreat (a|the|your) low\b|\b(a|the) (low|hypo)\b|هبوط)/,'juice glucose sign of low what to do if'],
 [/(move around|get around|mobility|walking)/,'walk'],
 [/(\b(he|him|his)\b.*\b(sick|ill|infect|fever|temperature|cough|doctor|symptom)|\b(sick|ill|infect|fever|temperature|cough|doctor)\w*\b.*\b(he|him|his)\b|\brahman\b(?! family))/,'your son'],
 [/(temperature|fever|حرارة|سخونة|infection|التهاب|\bdoctor|طبيب|دكتور|pediatric|respiratory)/,'sick chest infection'],
 [/(physical exam|stethoscope|\blungs?\b|bring him|assess the chil|examine (him|the child)|افحص|فحص)/,'your son chest'],
 [/(house condition|home condition|take (a )?round|tour|look around|المنزل|البيت|السكن)/,'home environment bedroom'],
 [/(how are you doing|how are things|how is everything|is every ?thing (all )?right)/,'how are you feeling'],
 [/(daily (activit|routine)|your day|يومك)/,'routine'],[/(\bneeds?\b(?!.*interpret)|احتياج)/,'support who helps'],
 [/(عائلة|عائله|اسرة|أسرة|اولاد|أولاد|اطفال|أطفال|كم طفل)/,'family household how many children'],
 [/(رمضان|صيام|صوم|تصوم|يصوم|ستصوم)/,'ramadan fast fasting'],
 [/(\biftar\b|\bsuhoor\b|\bbreakfast\b|\blunch\b|\bdinner\b|اكل|أكل|طعام|افطار|إفطار|سحور|وجبة)/,'food eat meal'],
 [/(نوم|ينام|تنام|غرفة)/,'sleep bedroom'],[/(زوج)/,'husband'],[/(مترجم|ترجم|لغتك)/,'interpreter'],
 [/(اعشاب|أعشاب|خلطة)/,'herbal herb remedy'],[/(مدرسة|المدرسه|المدرسة)/,'school'],
 [/(عيادة|مستشفى|مركز صحي|المركز الصحي|موعد)/,'clinic health centre'],
 [/(قلق|خايف|خائف|خوف)/,'worried worry'],[/(\bcough|كحة|كحه|سعال|ضيق تنفس|تنفس|breathing|breathe)/,'cough breath'],
 [/(\bwork\b|\bjob\b|شغل|عمل|وظيف)/,'job work'],[/(شكرا|شكراً|thanks)/,'thank you'],
 [/(\b(check|examine|assess|see|look at) (on )?(the|your|ur) (son|boy|child|kid)\b)/,'your son chest'],
 [/(\bfeel(ing)?\b|\bmood\b|\bstressed?\b|\bcoping\b)/,'how are you feeling']
];
function hasAr(t){ return /[\u0600-\u06FF]/.test(t); }
function arabicShare(t){ const ar=(t.match(/[\u0600-\u06FF]/g)||[]).length, la=(t.match(/[a-z]/gi)||[]).length; return ar/Math.max(1,ar+la); }
function expand(text){ let t=lc(text); TYPO.forEach(([r,w])=>{ t=t.replace(r,w); }); const add=[]; LEX.forEach(([r,w])=>{ if(r.test(t)) add.push(w); }); return add.length?t+' ;; '+add.join(' '):t; }
/* fuzzy fallback: content-word overlap with a topic's keywords (weight 1) and its scripted lines (weight 0.5) */
const STOP=new Set('what when where which while with would could should about there their your yours this that these those have from they them then than been being does were will just very much many some more most also into only over such tell know like want need please okay thank thanks hello really maybe here help nurse nurses student students today going come came good well right said says time make made take ask asking question questions'.split(' '));
function stems(t){ return (lc(t).match(/[a-z]{4,}/g)||[]).filter(w=>!STOP.has(w)).map(w=>w.slice(0,5)); }
function fuzzyTopic(S,sc,a){ const q=new Set(stems(a.text)); if(!q.size) return null; let best=null,bs=0;
  sc.topics.forEach(tp=>{ if(tp.judg||tp.id==='greet') return; const kw=new Set(stems((tp.kw||[]).join(' ').replace(/\\b|[\\()|?.*+\[\]^$]/g,' '))), tx=new Set(stems([tp.warm,tp.neutral].join(' ')));
    let v=0; q.forEach(w=>{ if(kw.has(w)) v+=1; else if(tx.has(w)) v+=0.5; }); v-=(S.topicUse[tp.id]||0)*0.2; if(v>bs){ bs=v; best=tp; } });
  return bs>=1?best:null; }
/* Deliberate, recognisable language-barrier design (per scenario). ar:false = persona does not understand Arabic. */
const LANG={S2:{ar:false,simple:true,who:'p'},S5:{ar:true,simple:true,who:'p'}};
const INTERP_RX=/(interpret|translat|مترجم|ترجم|your (own )?language|bengali|urdu|hindi|speak slowly|simple (words|english|language)|slowly|بلغتك|ببطء)/;
function analyze(text){
  const t=expand(text).trim(), words=lc(text).trim().split(/\s+/).filter(Boolean);
  const a={text:t, words:words.length, greet:RX.greet.test(t), intro:RX.intro.test(t), empathy:RX.empathy.test(t), consent:RX.consent.test(t), judg:RX.judg.test(t), stereo:RX.stereo.test(t), jargon:RX.jargon.test(t), init:RX.init.test(t), pii:RX.pii.test(text), pause:RX.pause.test(t)};
  a.question=/\?\s*$/.test(t)||RX.openStart.test(t)||RX.closedStart.test(t);
  a.open=(RX.openStart.test(t)&&!RX.closedStart.test(t))||RX.openAny.test(t);
  a.domains=DOMAINS.filter(d=>GIGER[d].rx.test(t));
  a.cultural=a.question&&/(believe|belief|faith|religio|prayer|ramadan|fast|tradition|custom|culture|family (decide|prefer)|prefer|important to you|matters to you|your (way|practice)|god|herb|remed|language|male|female|imam|halal)/.test(t);
  const pos=(t.match(RX.pos)||[]).length, neg=(t.match(RX.neg)||[]).length;
  a.sentiment=Math.max(-1,Math.min(1,(pos-neg+(a.empathy?1:0)-(a.judg?1:0))/3));
  a.codes=[]; if(a.open) a.codes.push('Q-OPEN'); if(a.cultural) a.codes.push('Q-CULT'); if(a.empathy) a.codes.push('EMP'); if(a.init) a.codes.push('INIT'); if(a.judg||a.stereo) a.codes.push('JUDG');
  return a;
}
function settings(){ return T.db.settings; }
function simElapsed(S, now){ if(!S.startedAt) return 0; const end=S.endedAt||now||Date.now(); return Math.max(0,end-S.startedAt-(S.pausedMs||0)-(S.pausedAt?(end-S.pausedAt):0)); }
function trustBand(v){ return v>=6?'warm':v>=4?'neutral':'guarded'; }
function persona(sc,id){ return sc.personas.find(p=>p.id===id)||sc.personas[0]; }
function log(S, kind, who, text, meta){ const now=Date.now(); const e={i:S.log.length, t:simElapsed(S,now), ts:new Date(now).toISOString(), kind, who:who||'', text:text||'', trust:S.trust, ...(meta||{})}; S.log.push(e); return e; }
function setTrust(S, v, reason){ const nv=Math.max(2,Math.min(10,v)); if(nv!==S.trust){ const old=S.trust; S.trust=nv; S.trustCurve.push({t:simElapsed(S),v:nv,turn:S.turns,reason:reason||''}); log(S,'trust','orchestrator',old+'→'+nv,{reason}); } }
function dpOrder(sc, dp){ return T.seededShuffle(dp.options.map(o=>o.id), sc.id+dp.id); } // identical for all teams & both cycles
function isResearch(S){ return S.mode==='research'; }
function adaptiveOn(S){ return S.mode==='practice' && settings().adaptivePractice; }
function hintRules(S){ const s=settings(); return isResearch(S)?{silence:s.silenceSec,max:s.maxHints}:{silence:s.practiceSilenceSec,max:s.practiceMaxHints}; }
/* ------------------------------ Orchestrator ------------------------------ */
const Orchestrator={
  create({team, cycle, scenarioId, mode, members, roles}){
    const sc=T.scenario(scenarioId), s=settings();
    const S={id:T.uid('ses'), team, cycle:+cycle, scenario:scenarioId, mode:mode||'research', engine:(s.engine==='llm'&&s.apiKey)||LLM.proxy()?'llm':'offline', model:LLM.proxy()?'proxy:'+((window.TCS_CON&&TCS_CON.env().llm.model)||'llm'):(s.engine==='llm'&&s.apiKey?s.model:'offline-rules-v1'), device:T.db.meta.device,
      members:members.slice(), roles:{...roles}, status:'prebrief', createdAt:new Date().toISOString(), startedAt:null, endedAt:null, pausedMs:0, pausedAt:null,
      trust:sc.trustStart||4, trustCurve:[], flags:{}, revealed:[], nearMiss:{}, dps:{}, dpPending:null, hintsUsed:0, lastStudentAt:null, turns:0, topicUse:{}, log:[], guard:[], adaptive:{easier:0,challenge:false}, debrief:null, measure:null, sbar:null, notes:''};
    S.trustCurve.push({t:0,v:S.trust,turn:0,reason:'start'});
    return S;
  },
  start(S){
    const sc=T.scenario(S.scenario); S.status='running'; S.startedAt=Date.now(); S.lastStudentAt=Date.now();
    log(S,'system','orchestrator','Simulation started',{cycle:S.cycle,mode:S.mode,engine:S.engine,model:S.model,adaptivity:isResearch(S)?'locked (equal conditions)':'adaptive'});
    sc.opening.forEach(o=>log(S,'agent',o.s,o.t,{persona:persona(sc,o.s).name}));
  },
  pause(S, by){ if(S.status!=='running') return; S.status='paused'; S.pausedAt=Date.now(); log(S,'system',by||'facilitator','PAUSED'); },
  resume(S, by){ if(S.status!=='paused') return; S.pausedMs+=Date.now()-S.pausedAt; S.pausedAt=null; S.status='running'; S.lastStudentAt=Date.now(); log(S,'system',by||'facilitator','RESUMED'); },
  end(S, reason){ if(S.pausedAt){ S.pausedMs+=Date.now()-S.pausedAt; S.pausedAt=null; } if(!S.endedAt) S.endedAt=Date.now(); S.status=reason==='stopped'?'stopped':'debrief'; log(S,'system','orchestrator','Simulation ended: '+(reason||'completed')); },
  nextDP(S){ const sc=T.scenario(S.scenario); return sc.dps.find(d=>!S.dps[d.id]); },
  checkDP(S){
    if(S.status!=='running'||S.dpPending) return null; const dp=this.nextDP(S); if(!dp) return null;
    const min=simElapsed(S)/60000;
    if(S.turns>=dp.at.turns||min>=dp.at.min){ S.dpPending=dp.id; S.dps[dp.id]={announcedAt:simElapsed(S),turnAt:S.turns,answer:null,revisions:[]}; log(S,'dp','orchestrator','DECISION POINT '+dp.id+': '+dp.q,{dp:dp.id}); return dp; }
    return null;
  },
  forceDP(S){ const dp=this.nextDP(S); if(!dp||S.dpPending) return null; S.dpPending=dp.id; S.dps[dp.id]={announcedAt:simElapsed(S),turnAt:S.turns,answer:null,revisions:[],forced:true}; log(S,'dp','facilitator','DECISION POINT '+dp.id+' (released by facilitator): '+dp.q,{dp:dp.id}); return dp; },
  answerDP(S, dpId, optId, just, by){
    const sc=T.scenario(S.scenario), dp=sc.dps.find(d=>d.id===dpId), opt=dp.options.find(o=>o.id===optId); const rec=S.dps[dpId];
    const revision=!!rec.answer; const a=analyze(just);
    const ans={opt:optId, just, by, t:simElapsed(S), q:opt.q, lein:opt.lein, words:a.words};
    if(revision){ rec.revisions.push({from:rec.answer.opt,to:optId,just,by,t:ans.t}); log(S,'dp_revise',by,dpId+': '+rec.answer.opt+'→'+optId+' — '+just,{dp:dpId,opt:optId,codes:['REV'],student:by}); }
    else log(S,'dp_answer',by,dpId+': '+opt.t+' — '+just,{dp:dpId,opt:optId,q:opt.q,lein:opt.lein,codes:a.words>=8?['DEC-J']:[],student:by,words:a.words});
    rec.answer=ans; const out=[];
    if(!revision){
      if(opt.trust) setTrust(S,S.trust+opt.trust,dpId+' choice');
      if(opt.setFlag&&!S.flags[opt.setFlag]){ S.flags[opt.setFlag]=true; log(S,'flag','orchestrator',opt.setFlag,{flag:opt.setFlag}); }
      if(opt.say){ out.push(log(S,'agent',opt.say.s,opt.say.t,{persona:persona(sc,opt.say.s).name})); }
      S.dpPending=null;
      if(adaptiveOn(S)){
        if(opt.q===0){ S.adaptive.easier=1; out.push(log(S,'coach','facilitator-support','Adaptive scaffold: the next hidden cue now needs 1 less trust point; a targeted hint is available.',{adaptive:true})); }
        const d1=S.dps.DP1&&S.dps.DP1.answer, d2=S.dps.DP2&&S.dps.DP2.answer;
        if(dpId==='DP2'&&d1&&d2&&d1.q===2&&d2.q===2&&sc.challenge&&!S.adaptive.challenge){ S.adaptive.challenge=true; out.push(log(S,'agent',sc.challenge.s,sc.challenge.t,{persona:persona(sc,sc.challenge.s).name,challenge:true})); }
      }
      if(!this.nextDP(S)) log(S,'system','orchestrator','All 4 decision points completed.');
    }
    return {opt,out};
  },
  maybeHint(S, now, manual){
    const r=hintRules(S); if(S.status!=='running') return null;
    if(S.hintsUsed>=r.max) return null;
    if(!manual && (now-S.lastStudentAt)/1000<r.silence) return null;
    const sc=T.scenario(S.scenario); let h;
    if(adaptiveOn(S)){ // adaptive: pick the hint whose domain is least covered
      const cov=Analytics.coverage(S); h=sc.hints.find((x,i)=>!S.log.some(e=>e.kind==='hint'&&e.hintIdx===i)&&(!x.d||!cov[x.d]))||sc.hints[S.hintsUsed%sc.hints.length];
    } else h=sc.hints[S.hintsUsed%sc.hints.length];
    const idx=sc.hints.indexOf(h); S.hintsUsed++; S.lastStudentAt=now;
    return log(S,'hint','facilitator-support',h.en,{hintIdx:idx,ar:h.ar,manual:!!manual,silenceSec:manual?null:r.silence});
  },
  /* main turn handler */
  async student(S, text, by, to){
    const sc=T.scenario(S.scenario); const now=Date.now();
    const gap=S.lastStudentAt?(now-S.lastStudentAt):0;
    const a=analyze(text);
    if(a.pii){ text=text.replace(RX.pii,'[removed]'); S.guard.push({t:simElapsed(S),type:'pii_input',by}); }
    const e=log(S,'student',by,text,{student:by,to:to||'all',codes:a.codes.slice(),domains:a.domains,open:a.open,empathy:a.empathy,judg:a.judg||a.stereo,stereo:a.stereo,jargon:a.jargon,sentiment:+a.sentiment.toFixed(2),words:a.words,gapMs:gap});
    if(gap>=60000) e.codes.push('SIL');
    S.lastStudentAt=now; S.turns++;
    if(a.pause){ this.pause(S,'student-safeword'); return [log(S,'safety','orchestrator','The simulation is paused. Your facilitator will check in with you.')]; }
    if(a.stereo) S.guard.push({t:simElapsed(S),type:'stereotype_input',by,text});
    // routing & trust
    const reply=Agents.offline(S,sc,a,to);
    let delta=0; const pos=a.empathy||a.consent||(a.cultural&&!a.judg)||((a.greet||a.intro)&&S.turns<=3)||(sc.id==='S6'&&/my name is/.test(a.text));
    const neg=a.judg||a.stereo||(a.jargon&&sc.jargonPenalty);
    if(neg) delta=-1; else if(pos) delta=1;
    if(reply.topicTrust){ delta = reply.topicTrust<0 ? Math.min(delta, reply.topicTrust) : Math.max(delta, reply.topicTrust>0 && !neg ? 1 : delta); }
    if(reply.flagTrust&&!neg) delta=Math.max(delta,1);
    if(delta) setTrust(S, S.trust+delta, (neg?(a.stereo?'stereotyping':a.judg?'judgmental':'jargon'):'respectful')+' turn');
    // reveal after trust update
    const rv=Agents.revealCheck(S,sc,a);
    let msgs=reply.msgs; if(rv.reveal){ msgs=reply.flagMsgs.concat([{s:rv.reveal.s,t:rv.reveal.t,reveal:rv.reveal.id}]); }
    else if(rv.blocked && (!reply.topicHit||reply.fuzzy) && !reply.barrier){ let bt=rv.blocked.blocked||reply.msgs[0]?.t; const privF=(rv.blocked.needFlags||[]).find(f=>!S.flags[f]&&/privat/.test(f)); if(privF&&bt&&bt[0]!=='('){ const o=sc.personas.find(x=>x.id!==rv.blocked.s&&x.id!=='f2'&&!/interpret/i.test(x.name)); if(o) bt='(glances at '+o.short+') '+bt; } msgs=reply.flagMsgs.concat([{s:rv.blocked.s,t:bt,near:rv.blocked.id}]); }
    if(!msgs.length) msgs=[Agents.fallback(S,sc,to,a)];
    // LLM generation (keeps deterministic orchestration; only wording comes from the model)
    const out=[];
    for(const m of msgs.slice(0,2)){
      let txt=m.t, src='script';
      // circuit breaker: after a provider error (credit/auth/429/timeout) the session silently stays on the scripted engine
      if(S.engine==='llm'&&!(S.llmDownUntil&&Date.now()<S.llmDownUntil)){
        try{ const g=await Agents.llmReply(S,sc,m,a,text); if(g){ txt=g.text; src=g.src; } }catch(err){ const msg=String(err.message||err); const hard=/HTTP (401|402|403|404)|credit|quota|insufficient|disabled|not configured/i.test(msg); S.llmDownUntil=Date.now()+(hard?6*3600e3:/HTTP 429|abort|timeout|Failed to fetch|HTTP 5\d\d/i.test(msg)?90e3:30e3); S.llmFallbacks=(S.llmFallbacks||0)+1; log(S,'guard','guardrail','LLM error → scripted fallback: '+msg.slice(0,120)); S.guard.push({t:simElapsed(S),type:'llm_error',hard}); }
      }
      const ev=log(S,'agent',m.s,txt,{persona:persona(sc,m.s).name,reveal:m.reveal||null,near:m.near||null,topic:m.topic||null,fb:m.fb||null,src,band:trustBand(S.trust)});
      if(m.reveal){ S.revealed.push(m.reveal); log(S,'reveal','orchestrator',m.reveal,{card:m.reveal,student:by}); }
      out.push(ev);
    }
    const dp=this.checkDP(S); if(dp) out.push({kind:'dp',dp:dp.id});
    return out;
  },
  tick(S){
    if(S.status!=='running') return {};
    const now=Date.now(), res={};
    const limit=settings().simMinutes*60000;
    if(simElapsed(S,now)>=limit){ this.end(S,'time limit'); res.ended=true; return res; }
    const h=this.maybeHint(S,now,false); if(h) res.hint=h;
    const dp=this.checkDP(S); if(dp) res.dp=dp;
    return res;
  }
};
/* ------------------------------ Patient & Family agents ------------------------------ */
const Agents={
  pickTopic(S,sc,a,to){
    let best=null, bs=-1e9; // a keyword hit always wins over the fallback, however often the topic was used
    sc.topics.forEach((tp,i)=>{ let sc_=anyRx(tp.kw,a.text); if(!sc_) return; sc_+=matchLen(tp.kw,a.text)/25; if(tp.judg) sc_+=2; if(to&&to!=='all'&&tp.s===to) sc_+=0.5; sc_-=(S.topicUse[tp.id]||0)*0.3; if(sc_>bs){bs=sc_;best=tp;} });
    return best?{tp:best,score:Math.max(bs,0.1)}:null;
  },
  offline(S,sc,a,to){
    const flagMsgs=[]; let flagTrust=0;
    (sc.flags||[]).forEach(f=>{ if(!S.flags[f.id]&&anyRx(f.kw,a.text)&&!(a.judg&&f.id!=='private')){ S.flags[f.id]=true; log(S,'flag','orchestrator',f.label,{flag:f.id}); if(f.say) flagMsgs.push({s:f.say.s,t:f.say.t}); if(f.trust) flagTrust+=f.trust; } });
    let interpNow=false; if(INTERP_RX.test(a.text)&&LANG[sc.id]&&!S.flags._interp){ interpNow=true; S.flags._interp=true; log(S,'flag','orchestrator','Interpreter / simple language used',{flag:'_interp'}); }
    const L=LANG[sc.id], arIn=hasAr(a.text)&&arabicShare(a.text.split(' ;; ')[0])>0.5;
    if(L&&!L.ar&&arIn&&!S.flags._interp&&!(a.greet&&a.words<=4)) return {msgs:flagMsgs.concat([{s:L.who,t:'(looks confused) Sorry... I do not understand Arabic well. Please, simple English, slowly... or maybe an interpreter?',fb:'barrier'}]),flagMsgs,topicTrust:0,flagTrust,topicHit:true,barrier:true};
    let pk=this.pickTopic(S,sc,a,to); if(!pk&&!flagMsgs.length&&!(a.judg||a.stereo)){ const ft=fuzzyTopic(S,sc,a); if(ft) pk={tp:ft,score:1,fuzzy:true}; }
    if(interpNow&&(!pk||pk.tp.id==='consent')){ const lt=sc.topics.find(x=>x.id==='language'); if(lt) pk={tp:lt,score:2}; }
    const tp=pk&&!(flagMsgs.length&&pk.score<1.6&&!pk.tp.judg)?pk.tp:null; let msgs=flagMsgs.slice(), topicTrust=0;
    if(!pk&&!flagMsgs.length&&!(a.judg||a.stereo)){ const rc=sc.cards.find(c=>S.revealed.includes(c.id)&&anyRx(c.kw,a.text)); if(rc){ const ct=rc.t.replace(/^\([^)]*\)\s*/,''); msgs.push({s:rc.s,t:'As I told you, '+ct.charAt(0).toLowerCase()+ct.slice(1),topic:'recall:'+rc.id}); return {msgs,flagMsgs,topicTrust:0,flagTrust,topicHit:true}; } }
    if(tp){
      S.topicUse[tp.id]=(S.topicUse[tp.id]||0)+1; topicTrust=tp.trust||0;
      const band=(a.judg||a.stereo)&&!tp.judg?'guarded':trustBand(S.trust+(tp.trust||0));
      let t=tp[band]||tp.neutral; if(S.topicUse[tp.id]>1&&S.topicUse[tp.id]%3&&!tp.judg&&t[0]!=='(') t=['','As I said, ','Like I told you, '][S.topicUse[tp.id]%3]+(/^(I\b|S\b|[A-Z][a-z]+ [A-Z])/.test(t)||sc.personas.some(x=>t.startsWith(x.short))?t:t.charAt(0).toLowerCase()+t.slice(1));
      if(L&&!L.ar&&arIn&&S.flags._interp&&t[0]!=='(') t='(through the interpreter) '+t;
      msgs.push({s:tp.s,t,topic:tp.id});
    } else if(a.judg||a.stereo){
      const who=(to&&to!=='all'&&sc.judgedReply[to])?to:(sc.judgedReply.p?'p':Object.keys(sc.judgedReply)[0]); msgs.push({s:who,t:sc.judgedReply[who]});
    } else if(a.empathy&&!flagMsgs.length){
      const p=to&&to!=='all'?to:'p'; const band=trustBand(S.trust);
      msgs.push({s:p,t:band==='warm'?'(smiles) Thank you. It helps to hear that.':band==='neutral'?'Thank you... yes.':'(nods slightly)'});
    } else if((a.greet||a.intro)&&!flagMsgs.length){
      const g=sc.topics.find(x=>x.id==='greet'); if(g) msgs.push({s:g.s,t:g[trustBand(S.trust)]});
    }
    return {msgs, flagMsgs, topicTrust, flagTrust, topicHit:!!tp, fuzzy:!!(pk&&pk.fuzzy)};
  },
  revealCheck(S,sc,a){
    let blocked=null;
    for(const c of sc.cards){
      if(S.revealed.includes(c.id)) continue; if(!anyRx(c.kw,a.text)) continue;
      const need=(c.minTrust||0)-(S.adaptive.easier||0);
      const ok=S.trust>=need&&!(c.nonJudg&&(a.judg||a.stereo))&&(c.needFlags||[]).every(f=>S.flags[f])&&(c.needCards||[]).every(x=>S.revealed.includes(x));
      if(ok) return {reveal:c};
      S.nearMiss[c.id]=(S.nearMiss[c.id]||0)+1;
      const why=[]; if(S.trust<need) why.push('trust '+S.trust+'<'+need); if(c.nonJudg&&(a.judg||a.stereo)) why.push('judgmental wording'); (c.needFlags||[]).forEach(f=>{ if(!S.flags[f]) why.push('needs: '+f); }); (c.needCards||[]).forEach(x=>{ if(!S.revealed.includes(x)) why.push('needs card: '+x); });
      log(S,'near','orchestrator',c.id+' not revealed ('+why.join(', ')+')',{card:c.id,why});
      if(!blocked) blocked=c;
    }
    return {blocked};
  },
  /* contextual, in-character fallback: classify what the student did instead of rotating random lines */
  fallback(S,sc,to,a){ const who=to&&to!=='all'&&sc.fallback[to]?to:'p'; const arr=sc.fallback[who]||['...']; const k='_fb'+who; S.topicUse[k]=(S.topicUse[k]||0)+1; const n=S.topicUse[k];
    a=a||{text:'',words:0}; const t=a.text.split(' ;; ')[0], L=LANG[sc.id];
    if(/(\bthank|\bbye\b|goodbye|see you|take care|we are leaving|we (will|have to) go|مع السلامة|شكرا)/.test(t)) return {s:who,t:['(smiles) Thank you for coming.','Thank you. You are welcome here.'][n%2],fb:'closing'};
    if(!a.question&&/(\b(you should|you can|you need|try to|we (advise|recommend|suggest)|i (advise|recommend|suggest)|it is (important|better)|we will|i will|let me|let's|we can)\b|ننصح|لازم)/.test(t)) return {s:who,t:['(nods) Okay... I understand. I will try.','Okay. Can you tell me what to do first?'][n%2],fb:'ack'};
    if(!a.question&&a.words<=2&&!/[a-z؀-ۿ]{4,}/.test(t)) return {s:who,t:'(nods and waits for your question)',fb:'wait'};
    if(L&&L.simple&&!S.flags._interp&&(a.words>20||a.jargon)) return {s:L.who,t:'(looks unsure) Sorry... too many words. One question, in simple English, please?',fb:'barrier'};
    if(a.question){ const others=sc.personas.filter(x=>x.id!==who&&!/interpret/i.test(x.name)).map(x=>x.short); const about=who==='p'&&others.length?(' Do you ask about me, or about '+others.join(' or ')+'?'):'';
      if(n%3===0) return {s:who,t:arr[(n/3|0)%arr.length],fb:'scripted'};
      return {s:who,t:(L&&L.simple?'Sorry, I do not understand the question.':'Sorry, I am not sure what you mean.')+about,fb:'clarify'}; }
    return {s:who,t:arr[n%arr.length],fb:'scripted'}; },
  systemPrompt(S,sc,m,a){
    const p=persona(sc,m.s), others=sc.personas.filter(x=>x.id!==m.s).map(x=>x.name).join(', ');
    const unrevealed=sc.cards.filter(c=>!S.revealed.includes(c.id)&&c.id!==m.reveal).map(c=>'['+c.id+'] '+c.fact).join('\n');
    const allowed=m.reveal?sc.cards.find(c=>c.id===m.reveal):null;
    return p.prompt+'\n\nSCENE: '+sc.setting.en+'\nOther people present: '+others+'.\n'+
      '\nDIRECTOR (hidden Orchestrator) INSTRUCTIONS FOR THIS TURN — follow exactly:\n'+
      '- Speak ONLY as '+p.name+'. No narration of other characters. 1-4 short sentences, natural spoken English, simple words.\n'+
      '- Current trust in the students: '+S.trust+'/10 → tone: '+trustBand(S.trust)+' (guarded = short and reserved; neutral = polite; warm = open and friendly).\n'+
      (allowed?('- You MAY now reveal this information, in your own words: '+allowed.fact+'\n'):'- Do NOT reveal any hidden information this turn.\n')+
      (unrevealed?('- NEVER mention or hint at these still-hidden facts:\n'+unrevealed+'\n'):'')+
      '- Content guide (meaning to convey): "'+m.t+'"\n'+
      '- Never teach, never diagnose, never give clinical advice, never say you are an AI or a simulation. No stereotypes. No phone numbers, laws or hotlines. No graphic content.\n'+
      (a.judg||a.stereo?'- The student was judgmental: respond briefly and a little hurt, without lecturing.\n':'');
  },
  async llmReply(S,sc,m,a,studentText){
    const sys=this.systemPrompt(S,sc,m,a);
    const hist=S.log.filter(e=>e.kind==='student'||e.kind==='agent').slice(-12).map(e=>e.kind==='student'?{role:'user',content:'Student ('+e.who+'): '+e.text}:{role:'assistant',content:persona(sc,e.who).short+': '+e.text});
    let txt=await LLM.chat([{role:'system',content:sys},...hist.slice(0,-0||undefined)],{});
    txt=Guard.clean(txt, persona(sc,m.s));
    let g=Guard.check(S,sc,txt,m);
    if(!g.ok){
      log(S,'guard','guardrail','Regenerating: '+g.issues.join('; ')); S.guard.push({t:simElapsed(S),type:'regen',issues:g.issues});
      txt=Guard.clean(await LLM.chat([{role:'system',content:sys+'\nSTRICT: your previous draft violated: '+g.issues.join('; ')+'. Rewrite safely.'},...hist],{}), persona(sc,m.s));
      g=Guard.check(S,sc,txt,m);
      if(!g.ok){ log(S,'guard','guardrail','Fallback to scripted line; facilitator alerted: '+g.issues.join('; ')); S.guard.push({t:simElapsed(S),type:'fallback',issues:g.issues,alert:true}); return {text:m.t,src:'script-fallback'}; }
    }
    return {text:txt,src:'llm'};
  }
};
/* ------------------------------ Guardrail layer ------------------------------ */
const Guard={
  clean(txt,p){ txt=String(txt||'').trim().replace(/^["“]|["”]$/g,''); const pre=new RegExp('^('+p.short+'|'+p.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')\\s*:\\s*','i'); return txt.replace(pre,'').trim(); },
  check(S,sc,txt,m){
    const issues=[]; const t=lc(txt);
    if(!t) issues.push('empty');
    if(/(as an ai|language model|i am an ai|i'm an ai|chatbot|this is a simulation|virtual patient)/.test(t)) issues.push('broke character / AI self-reference');
    if(/(you should (check|take|monitor|give|start)|the diagnosis is|i recommend|as a nurse you should|the correct answer)/.test(t)) issues.push('teaching/diagnosing');
    if(RX.stereo.test(t)) issues.push('stereotyping language');
    if(/(blood everywhere|beat me with|punched|kicked me|strangl|rape|stabb)/.test(t)) issues.push('graphic content');
    if(sc.sensitive&&/(hotline|\b\d{3,}\b|law (no|number)|article \d)/.test(t)) issues.push('hotline/law numbers in sensitive scenario');
    if(RX.pii.test(txt)) issues.push('personal data pattern');
    if((txt.match(/[.!?](\s|$)/g)||[]).length>6||txt.length>600) issues.push('too long');
    sc.cards.forEach(c=>{ if(!S.revealed.includes(c.id)&&c.id!==m.reveal&&LEAK[c.id]&&LEAK[c.id].test(txt)) issues.push('leaked hidden card '+c.id); });
    return {ok:!issues.length, issues};
  }
};
/* ------------------------------ LLM client (OpenAI-compatible) ------------------------------ */
const LLM={
  proxy(){ const P=window.TCS_CLOUD&&window.TCS_CLOUD.llmProxy&&window.TCS_CLOUD.llmProxy(); return P||null; },
  ready(){ const s=settings(); if(LLM.proxy()) return true; return s.engine==='llm'&&!!s.apiKey&&!!s.endpoint&&!!s.model; },
  async chat(messages, opt){
    opt=opt||{}; const P=LLM.proxy();
    if(P){ const pc=new AbortController(); const pt=setTimeout(()=>pc.abort(),opt.timeout||12000); let r; try{ r=await fetch(P.url,{method:'POST',signal:pc.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+P.token,'apikey':P.anon},body:JSON.stringify({messages,...(P.test?{test:true}:{}),temperature:opt.temperature??P.temperature,max_tokens:opt.maxTokens||300,...(opt.json?{response_format:{type:'json_object'}}:{})})}); } catch(e){ throw new Error('timeout/network: '+(e.name||e.message)); } finally{ clearTimeout(pt); }
      if(!r.ok){ const b=await r.text(); throw new Error('HTTP '+r.status+' '+b.slice(0,160)); }
      const j=await r.json(); const c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content; if(!c) throw new Error('Empty response'); if(j.model) LLM.lastModel=j.model; return c; }
    const s=settings(); const url=s.endpoint.replace(/\/+$/,'')+'/chat/completions';
    const ctrl=new AbortController(); const to=setTimeout(()=>ctrl.abort(),opt.timeout||25000);
    try{
      const r=await fetch(url,{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.apiKey},body:JSON.stringify({model:s.model,messages,temperature:opt.temperature??+s.temperature,max_tokens:opt.maxTokens||+s.maxTokens,...(opt.json?{response_format:{type:'json_object'}}:{})})});
      if(!r.ok){ const b=await r.text(); throw new Error('HTTP '+r.status+' '+b.slice(0,160)); }
      const j=await r.json(); const c=j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content; if(!c) throw new Error('Empty response');
      if(j.model) LLM.lastModel=j.model; return c;
    } finally{ clearTimeout(to); }
  }
};
/* ------------------------------ Analytics agent ------------------------------ */
const Analytics={
  coverage(S){ const cov={}; DOMAINS.forEach(d=>cov[d]=0); const sc=T.scenario(S.scenario);
    S.log.forEach(e=>{ if(e.kind==='student') (e.domains||[]).forEach(d=>cov[d]++); if(e.kind==='reveal'){ const c=sc.cards.find(x=>x.id===e.card); if(c&&c.d) cov[c.d]++; } });
    return cov; },
  session(S){
    const sc=T.scenario(S.scenario); const st=S.log.filter(e=>e.kind==='student'); const mins=Math.max(simElapsed(S)/60000,5); const per10=v=>v/mins*10;
    const members=S.members.length||1; const by={}; S.members.forEach(m=>by[m]={student:m,role:S.roles[m]||'',turns:0,words:0,open:0,cult:0,emp:0,judg:0,init:0,dp:0,justWords:[],rev:0,lastT:0,sent:[]});
    st.forEach(e=>{ const b=by[e.who]||(by[e.who]={student:e.who,role:'',turns:0,words:0,open:0,cult:0,emp:0,judg:0,init:0,dp:0,justWords:[],rev:0,lastT:0,sent:[]}); b.turns++; b.words+=e.words||0; const c=e.codes||[]; if(c.includes('Q-OPEN'))b.open++; if(c.includes('Q-CULT'))b.cult++; if(c.includes('EMP'))b.emp++; if(c.includes('JUDG'))b.judg++; if(c.includes('INIT'))b.init++; b.lastT=e.t; b.sent.push(e.sentiment||0); });
    S.log.filter(e=>e.kind==='dp_answer').forEach(e=>{ const b=by[e.who]; if(b){ b.dp++; b.justWords.push(e.words||0);} });
    S.log.filter(e=>e.kind==='dp_revise').forEach(e=>{ const b=by[e.who]; if(b) b.rev++; });
    const turns=st.length, speakers=Object.values(by).filter(b=>b.turns>0).length;
    const shares=Object.values(by).map(b=>turns?b.turns/turns:0); const gini=(()=>{ const n=shares.length; if(n<2||!turns) return 0; let s=0; shares.forEach(x=>shares.forEach(y=>s+=Math.abs(x-y))); return s/(2*n*n*T.mean(shares)); })();
    const cnt=code=>st.filter(e=>(e.codes||[]).includes(code)).length;
    const silences=st.filter(e=>(e.gapMs||0)>=60000).length;
    const dpA=Object.values(S.dps).filter(d=>d.answer);
    const cov=this.coverage(S); const covN=DOMAINS.filter(d=>cov[d]>0).length;
    const tv=S.trustCurve.map(x=>x.v);
    const just=S.log.filter(e=>e.kind==='dp_answer').map(e=>e.words||0);
    const revisions=S.log.filter(e=>e.kind==='dp_revise').length;
    const sentiment=T.mean(st.map(e=>e.sentiment||0))||0;
    const A={mins:+mins.toFixed(1), turns, speakers, members, participation:+(speakers/members).toFixed(2), balance:+(1-gini).toFixed(2),
      open:cnt('Q-OPEN'), cult:cnt('Q-CULT'), emp:cnt('EMP'), judg:cnt('JUDG'), init:cnt('INIT'), silences, hints:S.hintsUsed,
      turnsPer10:+per10(turns).toFixed(1), openPer10:+per10(cnt('Q-OPEN')).toFixed(1), empPer10:+per10(cnt('EMP')).toFixed(1), cultPer10:+per10(cnt('Q-CULT')).toFixed(1), judgPer10:+per10(cnt('JUDG')).toFixed(1),
      dpAnswered:dpA.length, dpQuality:dpA.length?+(T.mean(dpA.map(d=>d.answer.q))).toFixed(2):null, justWords:just.length?+T.mean(just).toFixed(1):0, revisions,
      trustStart:tv[0], trustEnd:S.trust, trustMin:Math.min(...tv), trustMax:Math.max(...tv), revealed:S.revealed.length, cards:sc.cards.length,
      giger:cov, gigerCovered:covN, sentiment:+sentiment.toFixed(2), guardFlags:S.guard.length,
      lein:dpA.reduce((o,d)=>{o[d.answer.lein]=(o[d.answer.lein]||0)+1;return o;},{})};
    const cl=x=>Math.max(0,Math.min(1,x));
    A.behavioural=Math.round(100*T.mean([cl(A.turnsPer10/8),A.participation,A.balance,cl(A.dpAnswered/4)]));
    A.cognitive=Math.round(100*T.mean([cl((A.open+A.cult)/Math.max(1,turns)*1.5),covN/6,(A.dpQuality||0)/2,cl(A.justWords/20),cl(A.revealed/Math.max(1,A.cards))]));
    A.emotional=Math.round(100*T.mean([cl(A.empPer10/2.5),(A.trustEnd-2)/8,(A.sentiment+1)/2,1-cl(A.judgPer10/2)]));
    A.students=Object.values(by).map(b=>({student:b.student,role:b.role,turns:b.turns,share:turns?+(b.turns/turns).toFixed(2):0,words:b.words,open:b.open,cult:b.cult,emp:b.emp,judg:b.judg,init:b.init,dp:b.dp,justWords:b.justWords.length?+T.mean(b.justWords).toFixed(1):0,rev:b.rev,sentiment:b.sent.length?+T.mean(b.sent).toFixed(2):0,lastT:b.lastT}));
    return A;
  },
  earlyWarnings(S){
    const A=this.session(S); const now=simElapsed(S); const out=[];
    A.students.forEach(b=>{
      if(A.turns>=6&&b.share<0.5/Math.max(1,A.members)) out.push({student:b.student,type:'low_share',msg:{ar:'مشاركة منخفضة جداً ('+Math.round(b.share*100)+'٪ من الأدوار)',en:'Very low participation ('+Math.round(b.share*100)+'% of turns)'}});
      if(now>8*60000&&(now-b.lastT)>8*60000) out.push({student:b.student,type:'quiet',msg:{ar:'لا مساهمة منذ أكثر من 8 دقائق',en:'No contribution for more than 8 minutes'}});
      if(b.judg>=2) out.push({student:b.student,type:'judg',msg:{ar:'عبارات حكمية متكررة',en:'Repeated judgmental wording'}});
    });
    return out;
  }
};
/* ------------------------------ Facilitator-support agent (coach) ------------------------------ */
const Coach={
  suggestions(S){
    const sc=T.scenario(S.scenario); if(!sc) return []; const A=Analytics.session(S); const out=[]; const add=(ar,en,k)=>out.push({ar,en,k:k||'info'});
    const missing=DOMAINS.filter(d=>!A.giger[d]);
    if(missing.length&&A.turns>=4) add('لم تُستكشف بعد مجالات Giger: '+missing.map(d=>GIGER[d].ar).join('، '),'Giger domains not yet explored: '+missing.map(d=>GIGER[d].en).join(', '));
    if(S.trust<=3) add('الثقة منخفضة ('+S.trust+'/10). راقب نبرة الفريق؛ في وضع البحث لا تتدخل إلا بقواعد البنك الثابت.','Trust is low ('+S.trust+'/10). Watch the team\'s tone; in research mode intervene only via the fixed hint bank.','warn');
    if(A.judg>0) add('رُصدت '+A.judg+' عبارة حكمية/تنميطية — دوّنها لمرحلة التحليل في الاستخلاص.',A.judg+' judgmental/stereotyping statement(s) flagged — note for the debrief analysis.','warn');
    if(A.turns>=6&&A.balance<0.6) add('المشاركة غير متوازنة؛ ذكّر الفريق بتدوير دور قائد التواصل.','Participation is unbalanced; remind the team to rotate the communication-lead role.');
    Object.keys(S.nearMiss).forEach(id=>{ if(!S.revealed.includes(id)){ const c=sc.cards.find(x=>x.id===id); if(c) add('محاولة قريبة للكشف عن «'+c.title+'» — '+c.cue,'Near-miss on "'+c.title+'" — '+c.cue); } });
    S.guard.filter(g=>g.alert).forEach(g=>add('تنبيه حماية: '+g.issues.join('؛ '),'Guardrail alert: '+g.issues.join('; '),'danger'));
    if(S.mode==='research') add('وضع البحث: التكيّف مقفل والتلميحات من البنك الثابت فقط (تكافؤ الدورتين).','Research mode: adaptivity locked; hints only from the fixed bank (equal conditions).','muted');
    return out;
  },
  async llm(S){ const sc=T.scenario(S.scenario); const A=Analytics.session(S);
    const prompt='You are a Facilitator Co-Pilot for a nursing simulation (facilitator only; never address students). Give 3 concise coaching suggestions (bullet points, max 20 words each) for the facilitator, based on this anonymised state. Do not reveal hidden information to students. State: '+JSON.stringify({scenario:sc.title.en,trust:S.trust,revealed:S.revealed,hidden:sc.cards.filter(c=>!S.revealed.includes(c.id)).map(c=>c.cue),giger:A.giger,turns:A.turns,judg:A.judg,emp:A.emp,dp:Object.keys(S.dps)});
    return LLM.chat([{role:'user',content:prompt}],{maxTokens:250}); }
};
/* ------------------------------ Debrief-support agent (Cycle 2 / PEARLS) ------------------------------ */
const Debrief={
  timeline(S){ const sc=T.scenario(S.scenario); return S.log.filter(e=>['dp_answer','dp_revise','reveal','hint','safety','flag'].includes(e.kind)||(e.kind==='trust')).map(e=>{ let label=e.text;
      if(e.kind==='dp_answer'){ const dp=sc.dps.find(d=>d.id===e.dp), o=dp&&dp.options.find(x=>x.id===e.opt); label=e.dp+' — '+(o?o.t:'')+' | '+T.L('التبرير: ','Rationale: ')+(e.text.split(' — ').slice(1).join(' — ')); }
      if(e.kind==='reveal'){ const c=sc.cards.find(x=>x.id===e.card); label=T.L('كُشف: ','Revealed: ')+(c?c.title:e.card); }
      if(e.kind==='trust') label=T.L('الثقة ','Trust ')+e.text+' ('+(e.reason||'')+')';
      return {t:e.t,kind:e.kind,label,who:e.who}; }); },
  moments(S){
    const sc=T.scenario(S.scenario); const out=[]; const st=S.log;
    const rv=st.find(e=>e.kind==='reveal'); const jd=st.find(e=>e.kind==='student'&&e.judg);
    if(jd) out.push({type:'cultural',t:jd.t,quote:jd.text,why:T.L('عبارة حكمية/تنميطية أثّرت في الثقة','Judgmental/stereotyping wording affected trust'),link:'M5'});
    else if(rv){ const prev=st.slice(0,rv.i).reverse().find(e=>e.kind==='student'); const c=sc.cards.find(x=>x.id===rv.card); out.push({type:'cultural',t:rv.t,quote:prev?prev.text:'',why:T.L('هذا السؤال كشف: ','This question revealed: ')+(c?c.title:''),link:'M5'}); }
    const dps=st.filter(e=>e.kind==='dp_answer'); if(dps.length){ const low=dps.slice().sort((a,b)=>(a.q??2)-(b.q??2))[0]; out.push({type:'clinical',t:low.t,quote:low.text,why:low.q===2?T.L('قرار متقدم — ما الذي جعله ممكناً؟','A strong decision — what made it possible?'):T.L('قرار يستحق المراجعة','A decision worth revisiting'),link:sc.lecture}); }
    const tr=S.log.filter(e=>e.kind==='trust'); if(tr.length){ const big=tr.slice().sort((a,b)=>Math.abs(b.trust-(+b.text.split('→')[0]))-Math.abs(a.trust-(+a.text.split('→')[0])))[0]; const prev=S.log.slice(0,big.i).reverse().find(e=>e.kind==='student'); out.push({type:'communication',t:big.t,quote:prev?prev.text:'',why:T.L('تغيّرت الثقة ','Trust changed ')+big.text,link:'M5'}); }
    return out.slice(0,3);
  },
  advocacy(S){ const ms=this.moments(S); return ms.map(m=>({stem:T.L('لاحظتُ أنه عند ','I noticed that when ')+'"'+m.quote.slice(0,90)+'"'+T.L('، ','... ')+m.why+T.L('. كنتُ قلقاً/مهتماً بأن… أودّ أن أعرف بماذا كنتم تفكرون في تلك اللحظة؟',". I was curious/concerned that... I'm curious what you were thinking at that moment?"),...m})); },
  report(S){ // cultural-competence feedback report (per team)
    const sc=T.scenario(S.scenario), A=Analytics.session(S);
    const covered=DOMAINS.filter(d=>A.giger[d]>0), missed=DOMAINS.filter(d=>!A.giger[d]);
    const missedCues=sc.cards.filter(c=>!S.revealed.includes(c.id)).map(c=>({title:c.title,cue:c.cue,near:S.nearMiss[c.id]||0}));
    const flags=S.log.filter(e=>e.kind==='student'&&e.judg).map(e=>({t:e.t,who:e.who,text:e.text,stereo:!!e.stereo}));
    const decisions=sc.dps.map(dp=>{ const r=S.dps[dp.id]; const o=r&&r.answer&&dp.options.find(x=>x.id===r.answer.opt); return {id:dp.id,q:dp.q,choice:o?o.t:null,lein:o?o.lein:null,quality:o?o.q:null,conseq:o?o.conseq:null,best:dp.options.find(x=>x.q===2).t,revisions:r?r.revisions.length:0}; });
    const strengths=[], next=[];
    if(A.emp>=2) strengths.push(T.L('استخدام متكرر لعبارات التعاطف','Frequent empathic statements'));
    if(A.open>=3) strengths.push(T.L('أسئلة مفتوحة استكشافية','Exploratory open questions'));
    if(covered.length>=5) strengths.push(T.L('تغطية واسعة لمجالات Giger','Broad Giger-domain coverage'));
    if(S.revealed.length===sc.cards.length) strengths.push(T.L('كُشفت كل المعلومات المخفية','All hidden cues uncovered'));
    if(A.trustEnd>A.trustStart) strengths.push(T.L('ارتفعت الثقة خلال الزيارة','Trust increased during the encounter'));
    missed.forEach(d=>next.push(T.L('استكشفوا مجال «'+GIGER[d].ar+'»: ','Explore the "'+GIGER[d].en+'" domain: ')+sc.giger[d]));
    if(flags.length) next.push(T.L('استبدلوا العبارات الحكمية بأسئلة مفتوحة غير حكمية (مبدأ التباين داخل الجماعة).','Replace judgmental wording with open, non-judgmental questions (intra-cultural variation).'));
    missedCues.forEach(c=>next.push(T.L('دليل فائت: ','Missed cue: ')+c.title+' — '+c.cue));
    return {scenario:sc.id,covered,missed,missedCues,flags,decisions,strengths,next,variation:sc.giger.variation,A};
  },
  async llmNarrative(S){ const r=this.report(S); return LLM.chat([{role:'system',content:'You are a Debriefing Support Assistant for the FACILITATOR only (Cycle 2). Neutral, non-judgmental, no student names, max 180 words. Output: timeline highlights, 3 key learning moments (cultural, clinical/community, communication) with short quotes, Giger coverage, 2 advocacy-inquiry stems, and flag any AI error.'},{role:'user',content:JSON.stringify({report:{...r,A:undefined},moments:this.moments(S),guard:S.guard})}],{maxTokens:450}); }
};
/* ------------------------------ Tool 2 observation scoring ------------------------------ */
const Tool2={
  items:[
   {n:1,s:'E',o:'Pays attention in class',a:'Pays attention during the simulation',dim:'B'},
   {n:2,s:'E',o:'Works well with other children',a:'Works well with peers in the group',dim:'B'},
   {n:3,s:'I',o:'Attempts to do his/her work thoroughly and well, rather than just trying to get by',a:'Attempts to do the work thoroughly rather than just getting by',dim:'C'},
   {n:4,s:'D',o:'Acts restless, is unable to sit still',a:'Acts restless, unable to stay focused on the task',dim:'B',neg:true},
   {n:5,s:'I',o:'Participates actively in discussions',a:'Participates actively in group discussion',dim:'B'},
   {n:6,s:'E',o:'Completes assigned seatwork',a:'Completes assigned simulation tasks/roles',dim:'B'},
   {n:7,s:'D',o:'Needs to be reprimanded',a:'Needs to be redirected by the facilitator',dim:'B',neg:true},
   {n:8,s:'D',o:'Annoys or interferes with peers\' work',a:'Interferes with peers\' work',dim:'B',neg:true},
   {n:9,s:'E',o:'Is persistent when confronted with difficult problems',a:'Persists when the scenario becomes difficult',dim:'C'},
   {n:10,s:'N',o:'Doesn\'t seem to know what is going on in class',a:'Does not seem to know what is going on in the scenario',dim:'B',neg:true},
   {n:11,s:'N',o:'Is withdrawn, uncommunicative',a:'Is withdrawn or uncommunicative',dim:'E',neg:true},
   {n:12,s:'E',o:'Approaches new assignments with sincere effort',a:'Approaches new scenario tasks with sincere effort',dim:'C'},
   {n:13,s:'I',o:'Asks questions to get more information',a:'Asks questions to obtain more information from the patient/family',dim:'C'},
   {n:14,s:'D',o:'Talks with classmates too much',a:'Engages in off-task talk with peers',dim:'B',neg:true},
   {n:15,s:'N',o:'Doesn\'t take independent initiative, must be helped to get started and kept going on work',a:'Does not take initiative; must be prompted to start and continue',dim:'B',neg:true},
   {n:16,s:'E',o:'Tries to finish assignments even when they are difficult',a:'Tries to finish tasks even when they are difficult',dim:'C'},
   {n:17,s:'I',o:'Raises his/her hand to answer a question or volunteer information',a:'Volunteers contributions or information',dim:'B'},
   {n:18,s:'E',o:'Gets discouraged and stops trying when encountering an obstacle in schoolwork; is easily frustrated',a:'Gets discouraged and stops trying when facing an obstacle; easily frustrated',dim:'E',rev:true}
  ],
  added:[
   {n:'A1',s:'SIM',a:'Contributes to clinical/community decision-making with a rationale',dim:'C'},
   {n:'A2',s:'SIM',a:'Responds to changing scenario information (adjusts the plan)',dim:'C'},
   {n:'A3',s:'SIM',a:'Shows interest/enthusiasm in the scenario',dim:'E'},
   {n:'A4',s:'SIM',a:'Expresses empathy or respect toward the virtual patient\'s culture',dim:'E'},
   {n:'A5',s:'SIM',a:'Is involved in the post-simulation discussion (summary/debrief) — rated separately',dim:'B'},
   {n:'A6',s:'SIM',a:'Takes culturally responsive initiative (e.g., requests an interpreter, adapts the plan)',dim:'B'}
  ],
  score(items){
    const v=k=>items[k]==null||items[k]===''?null:+items[k]; const r=x=>x==null?null:6-x;
    const pick=(ns,fn)=>ns.map(n=>fn?fn(v(n)):v(n));
    const E=T.mean([...pick([1,2,6,9,12,16]), r(v(18))]), I=T.mean(pick([3,5,13,17])), D=T.mean(pick([4,7,8,14])), N=T.mean(pick([10,11,15]));
    const posComposite=T.mean([E,I,D==null?null:6-D,N==null?null:6-N]);
    const B=T.mean([...pick([1,2,6,5,17]),...pick([4,7,8,14,10,15],r),v('A5'),v('A6')]);
    const C=T.mean([...pick([9,12,16,3,13]),v('A1'),v('A2')]);
    const Em=T.mean([r(v(18)),r(v(11)),v('A3'),v('A4')]);
    const added=T.mean(['A1','A2','A3','A4','A5','A6'].map(v));
    const answered=Object.values(items).filter(x=>x!==''&&x!=null).length;
    return {E,I,D,N,posComposite,B,C,Em,added,answered};
  },
  kappa(a,b){ const keys=Object.keys(a).filter(k=>a[k]!=null&&a[k]!==''&&b[k]!=null&&b[k]!==''); if(keys.length<3) return null;
    const cats=[1,2,3,4,5]; const n=keys.length; let po=0; const pa={},pb={}; cats.forEach(c=>{pa[c]=0;pb[c]=0;});
    keys.forEach(k=>{ if(+a[k]===+b[k]) po++; pa[+a[k]]++; pb[+b[k]]++; }); po/=n; let pe=0; cats.forEach(c=>pe+=(pa[c]/n)*(pb[c]/n));
    return {kappa:pe===1?1:+((po-pe)/(1-pe)).toFixed(3), agreement:+po.toFixed(3), n}; }
};
/* ------------------------------ SBAR documentation feedback ------------------------------ */
const SBAR={
  feedback(S, text){ const sc=T.scenario(S.scenario); const t=lc(text); const fb=[];
    const sec={S:/(^|\n)\s*s(ituation)?\s*[:\-]/i,B:/(^|\n)\s*b(ackground)?\s*[:\-]/i,A:/(^|\n)\s*a(ssessment)?\s*[:\-]/i,R:/(^|\n)\s*r(ecommendation)?\s*[:\-]/i};
    Object.keys(sec).forEach(k=>fb.push({ok:sec[k].test(text),ar:'قسم '+k+' موجود',en:'Section '+k+' present'}));
    S.revealed.forEach(id=>{ const c=sc.cards.find(x=>x.id===id); const kws=(c.kw||[]).slice(0,6); const hit=kws.some(k=>{ try{return new RegExp(k,'i').test(t);}catch(e){return false;} })||(LEAK[id]&&LEAK[id].test(text)); fb.push({ok:hit,ar:'ذُكرت المعلومة المكتشفة: '+c.title,en:'Includes discovered finding: '+c.title}); });
    fb.push({ok:!RX.judg.test(t)&&!RX.stereo.test(t),ar:'لغة موضوعية غير حكمية',en:'Objective, non-judgmental language'});
    fb.push({ok:/(cultur|belief|prefer|religio|fast|prayer|family decision|language|interpreter)/.test(t),ar:'تتضمن اعتبارات ثقافية',en:'Includes cultural considerations'});
    fb.push({ok:!RX.pii.test(text),ar:'لا بيانات تعريفية',en:'No identifying data'});
    fb.push({ok:t.split(/\s+/).length>=40,ar:'تفصيل كافٍ (≥ 40 كلمة)',en:'Sufficient detail (≥ 40 words)'});
    return {items:fb, score:Math.round(100*fb.filter(x=>x.ok).length/fb.length)}; }
};
/* ------------------------------ Search & tutor grounding ------------------------------ */
const Search={
  idx:null,
  tok(s){ return lc(s).replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(w=>w.length>2&&!/^(the|and|for|with|are|that|this|from|into|their|have|has|was|were|will|can|its|of|to|in)$/.test(w)); },
  build(){ const docs=[]; (window.TCS_MODULES||[]).forEach(m=>m.slides.forEach(s=>{ const body=s.blocks.map(b=>b.k==='table'?b.rows.map(r=>r.join(' ')).join(' '):b.items.map(i=>i[1]).join(' ')).join(' ')+' '+(s.notes||''); docs.push({type:'slide',m:m.id,mt:m.en,s:s.n,title:s.title,text:body}); }));
    T.scenarios().forEach(sc=>docs.push({type:'scenario',id:sc.id,m:sc.lecture,title:sc.id+' — '+sc.title.en,text:sc.setting.en+' '+sc.objectives.map(o=>o.en).join(' ')}));
    (window.TCS_FAQ||[]).forEach((f,i)=>docs.push({type:'faq',i,title:f.q.en,text:f.a.en+' '+f.q.ar+' '+f.a.ar+' '+(f.k||'')}));
    const df={}; docs.forEach(d=>{ d.tf={}; this.tok(d.title+' '+d.title+' '+d.text).forEach(w=>d.tf[w]=(d.tf[w]||0)+1); Object.keys(d.tf).forEach(w=>df[w]=(df[w]||0)+1); });
    this.idx={docs,df,N:docs.length}; },
  query(q,limit,filter){ if(!this.idx) this.build(); const ws=this.tok(q); if(!ws.length) return [];
    const {docs,df,N}=this.idx; const res=[];
    docs.forEach(d=>{ if(filter&&!filter(d)) return; let s=0; ws.forEach(w=>{ Object.keys(d.tf).forEach(k=>{ if(k===w||(w.length>4&&k.startsWith(w.slice(0,Math.max(4,w.length-2))))) s+=(1+Math.log(d.tf[k]))*Math.log(1+N/df[k]); }); }); if(s>0) res.push({d,s}); });
    return res.sort((a,b)=>b.s-a.s).slice(0,limit||10).map(r=>r.d); }
};
window.TCS_ENGINE={RX,GIGER,DOMAINS,analyze,Orchestrator,Agents,Guard,LLM,Analytics,Coach,Debrief,Tool2,SBAR,Search,simElapsed,trustBand,dpOrder,persona,isResearch,hintRules,log};
})();
