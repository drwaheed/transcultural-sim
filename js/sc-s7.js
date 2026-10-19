/* Scenario S7 (M7). All characters fictional. */
(window.TCS_SCENARIOS=window.TCS_SCENARIOS||[]).push({
 id:'S7', lecture:'M7', icon:'🏫', research:false, sensitive:false, trustStart:4, jargonPenalty:true,
 title:{en:'Type 1 diabetes and fasting at school',ar:'السكري من النوع الأول والصيام في المدرسة'},
 setting:{en:'School clinic. Ali (15, T1DM) felt shaky during PE. He wants to fast in Ramadan like his friends. His mother arrives; the PE teacher is present.',ar:'عيادة المدرسة. علي (15 عاماً، سكري نوع 1) شعر برجفة خلال حصة الرياضة. يريد الصيام في رمضان مثل أصدقائه. حضرت أمه، ومعلم الرياضة موجود.'},
 objectives:[{en:'Manage hypoglycaemia at school safely.',ar:'التعامل الآمن مع انخفاض السكر في المدرسة.'},{en:'Engage an adolescent as a partner (IHP/DMMP).',ar:'إشراك المراهق شريكاً في الخطة الصحية الفردية.'},{en:'Reduce stigma and involve the family.',ar:'الحد من الوصمة وإشراك الأسرة.'}],
 personas:[
  {id:'p',name:'Ali',short:'Ali',role:{en:'Student, 15 — T1DM',ar:'طالب، 15 عاماً — سكري نوع 1'},age:15,avatar:'AL',color:'#0369a1',voice:{pitch:1.2,rate:1.05},prompt:'You are Ali (fictional), 15, type 1 diabetes since 9, uses an insulin pen. Hides injections at school because classmates tease him. Wants to fast in Ramadan like friends. Cooperative if treated as a partner; shuts down if lectured. 1-3 sentences.'},
  {id:'f1',name:'Mrs. Salma',short:'Salma',role:{en:'Mother, 42',ar:'الأم، 42 عاماً'},age:42,avatar:'SM',color:'#be185d',voice:{pitch:1.1,rate:1},prompt:'You are Mrs. Salma (fictional), 42, Ali\'s mother, anxious, works as a cashier. Proud that Ali wants to fast; unsure what the school can do. 1-3 sentences.'},
  {id:'f2',name:'Mr. Faisal',short:'Faisal',role:{en:'PE teacher',ar:'معلم الرياضة'},age:35,avatar:'FA',color:'#b45309',voice:{pitch:0.85,rate:1.05},prompt:'You are Mr. Faisal (fictional), 35, PE teacher, caring but untrained in diabetes; thought Ali was "just tired". 1-3 sentences.'}
 ],
 giger:{comm:'Arabic and English; the adolescent prefers private talk away from adults.',space:'Hides injections; wants privacy at school.',social:'Peer acceptance central; mother main carer; teacher present.',time:'Ramadan approaching; PE before lunch.',env:'The family sees fasting as a milestone of maturity.',bio:'T1DM; hypoglycaemia risk with exercise and fasting.',variation:'Ali is a top scorer in maths and tracks his carbs with an app.'},
 opening:[{s:'f2',t:'He was shaking during the run, so I brought him. I thought he was just tired.'},{s:'p',t:'I\'m fine now. Can I go back to class?'}],
 flags:[{id:'private_ali',kw:['privat','alone','just (you|us)','without (your mum|the teacher)','between us','confidential'],label:'Private talk with Ali',say:{s:'f2',t:'I\'ll wait outside with your mum, Ali.'}}],
 cards:[
  {id:'hiding',title:'Hides injections due to teasing',fact:'Ali skips his lunchtime insulin and checks because classmates tease him.',cue:'Talk with Ali privately and respectfully about school life.',kw:['school','friends','classmates','lunch','inject','check (at|in) school','tease','bull'],minTrust:5,needFlags:['private_ali'],s:'p',d:'social',t:'(quietly) Honestly, I don\'t check at lunch. The boys make jokes when I use the pen. So I wait until home.',blocked:'Everything is fine at school.'},
  {id:'carb_app',title:'Uses a carb-counting app (individual variation)',fact:'Ali tracks carbs with an app and is strong in maths.',cue:'Ask how he manages his diabetes himself.',kw:['manage','app','count','carb','how do you (handle|manage)','what works'],minTrust:4,s:'p',d:'bio',t:'I use an app to count carbs, I\'m actually good at it. Maths is my best subject.'},
  {id:'teacher_untrained',title:'Teacher untrained',fact:'Mr. Faisal has never received diabetes training and there is no glucose kit in the gym.',cue:'Ask the teacher what he knows and what is available.',kw:['teacher','faisal','training','kit','gym','know about diabetes','emergency plan'],minTrust:3,s:'f2',d:'env',t:'To be honest, nobody trained me. There\'s no sugar kit in the gym.'}
 ],
 topics:[
  {id:'greet',kw:['hello','\\bhi\\b','salam','hey'],s:'p',d:'comm',warm:'Hi.',neutral:'Hi.',guarded:'...'},
  {id:'symptoms',kw:['shak','dizz','sweat','how do you feel','symptom','how are you'],s:'p',d:'bio',warm:'I felt shaky and sweaty during the run. I skipped breakfast, I was late.',neutral:'A bit shaky.',guarded:'I\'m fine.'},
  {id:'treat',kw:['juice','glucose','sugar (check|level)','check your sugar','15 ?g','test now','dextrose'],s:'p',d:'bio',warm:'I have juice in my bag. My meter says 3.4. Okay, I\'ll drink it.',neutral:'Okay.',guarded:'I said I\'m fine.'},
  {id:'fasting',kw:['fast','ramadan','suhoor','iftar'],s:'p',d:'time',warm:'All my friends fast. I want to fast too, I\'m not a kid anymore.',neutral:'I want to fast.',guarded:'Everyone says no.'},
  {id:'partner',kw:['what do you think','your (opinion|idea|plan)','together','partner','help us (plan|decide)','your goals'],s:'p',d:'social',trust:1,warm:'Really? Nobody asks me. Maybe I could start fasting on weekends with my doctor\'s plan?',neutral:'I don\'t know.',guarded:'Whatever.'},
  {id:'mother',kw:['mother','mum','mom','salma','parent'],s:'f1',d:'social',warm:'I\'m proud he wants to fast. But I\'m scared at night. What does the school do if he gets low?',neutral:'I worry.',guarded:'We manage at home.'}
 ],
 fallback:{p:['(shrugs)','Can I go now?'],f1:['I don\'t know.','Please tell me what to do.'],f2:['I just teach PE.']},
 judgedReply:{p:'(rolls eyes) Here we go, another lecture.',f1:'He is a good boy, he tries.'},
 dps:[
  {id:'DP1',at:{turns:4,min:6},q:'Ali is shaky and sweaty and says he is fine. What is your immediate action?',options:[
   {id:'a',t:'Check glucose now; if low, give 15 g fast-acting carbohydrate, recheck in 15 minutes, then a snack; stay with him',lein:'accommodation',q:2,conseq:'Correct hypoglycaemia management.'},
   {id:'b',t:'Let him return to class',lein:'preservation',q:0,conseq:'Unsafe.'},
   {id:'c',t:'Call an ambulance immediately',lein:'repatterning',q:1,conseq:'Over-escalation if he is conscious and able to swallow.'}]},
  {id:'DP2',at:{turns:8,min:13},q:'How will you discuss fasting with Ali?',options:[
   {id:'a',t:'Talk with him as a partner, acknowledge what fasting means to him, involve his diabetes team for an individual risk assessment and plan, mention exemptions respectfully',lein:'accommodation',q:2,conseq:'He engages.',trust:1},
   {id:'b',t:'Tell him people with T1DM cannot fast',lein:'repatterning',q:0,conseq:'He disengages.',trust:-2},
   {id:'c',t:'Leave it to the family',lein:'preservation',q:1,conseq:'Missed school-health role.'}]},
  {id:'DP3',at:{turns:12,min:20},q:'How will you communicate with the family?',options:[
   {id:'a',t:'Meet the mother with Ali present, share today\'s event factually, agree roles and contacts, and respect his privacy about teasing unless safety requires disclosure',lein:'accommodation',q:2,conseq:'Builds partnership.'},
   {id:'b',t:'Tell the mother he is hiding injections without telling Ali',lein:'repatterning',q:0,conseq:'Breaks trust.',trust:-2},
   {id:'c',t:'Send a note home',lein:'preservation',q:1,conseq:'Impersonal.'}]},
  {id:'DP4',at:{turns:16,min:27},q:'What will you update in the Individualised Health Plan (IHP)?',options:[
   {id:'a',t:'Hypo action plan and glucose kit in the gym, teacher training, a private space for checks, anti-stigma class session (with Ali\'s consent), Ramadan plan from his diabetes team',lein:'accommodation',q:2,conseq:'WSCC-aligned and stigma-reducing.'},
   {id:'b',t:'Exclude him from PE',lein:'repatterning',q:0,conseq:'Discriminatory.'},
   {id:'c',t:'No changes',lein:'preservation',q:0,conseq:'Risk persists.'}]}
 ],
 hints:[{en:'Hint: What is the immediate safety priority?',ar:'تلميح: ما أولوية السلامة الفورية؟'},{en:'Hint: Teenagers share more when treated as partners and given privacy.',ar:'تلميح: المراهقون يتحدثون أكثر حين يُعامَلون شركاء وتُحترم خصوصيتهم.'},{en:'Hint: Who else in the school needs to be part of the plan?',ar:'تلميح: من غيره في المدرسة يجب أن يكون جزءاً من الخطة؟'}],
 challenge:{s:'p',t:'If you tell the class about my diabetes, I\'ll never come back to school.'},
 expected:['Treats hypoglycaemia correctly','Talks privately with Ali','Treats him as a partner','Involves the teacher and family','Updates the IHP'],
 quiz:[
  {q:'The WSCC model stands for:',o:['Whole School, Whole Community, Whole Child','World School Care Committee','Weekly School Clinic Checks','None of these'],a:0,why:'M7: Whole School, Whole Community, Whole Child.'},
  {q:'The "rule of 15" for hypoglycaemia means:',o:['15 units of insulin','15 g fast carbohydrate, recheck in 15 minutes','15 minutes of exercise','A 15 mmol/L target'],a:1,why:'Standard hypoglycaemia management.'},
  {q:'An IHP is:',o:['An Individualised Health Plan','A hospital policy','An insurance form','A grading tool'],a:0,why:'M7: school nurses write IHPs.'},
  {q:'A DMMP is written by:',o:['The PE teacher','The student\'s diabetes healthcare provider','Classmates','The cafeteria'],a:1,why:'M7: Diabetes Medical Management Plan.'}],
 reflection:['How did treating Ali as a partner change the conversation?','How can school nurses reduce stigma?']
});
