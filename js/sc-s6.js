/* Scenario S6 (M6). All characters fictional. */
(window.TCS_SCENARIOS=window.TCS_SCENARIOS||[]).push({
 id:'S6', lecture:'M6', icon:'🦯', research:false, sensitive:false, trustStart:5, jargonPenalty:true,
 title:{en:'Abilities, not disability',ar:'القدرات لا الإعاقة'},
 setting:{en:'Home visit to Mrs. Zainab (60), blind since age 30, with knee osteoarthritis. Her daughter Huda (34) is her main carer.',ar:'زيارة منزلية للسيدة زينب (60 عاماً)، كفيفة منذ الثلاثين ومصابة بخشونة الركبة. ابنتها هدى (34 عاماً) هي مقدمة الرعاية الرئيسية.'},
 objectives:[{en:'Communicate respectfully with a person who is blind.',ar:'التواصل باحترام مع شخص كفيف.'},{en:'Apply the ICF and a rights-based approach (CRPD).',ar:'تطبيق تصنيف ICF والنهج القائم على الحقوق.'},{en:'Assess caregiver burden.',ar:'تقييم عبء مقدّم الرعاية.'}],
 personas:[
  {id:'p',name:'Mrs. Zainab Ali',short:'Zainab',role:{en:'60 — blind, knee osteoarthritis',ar:'60 عاماً — كفيفة، خشونة الركبة'},age:60,avatar:'ZA',color:'#0f766e',voice:{pitch:1,rate:0.92},prompt:'You are Mrs. Zainab Ali (fictional), 60, blind since 30 (diabetic retinopathy), knee osteoarthritis. Independent, sharp, runs a Quran recitation circle for neighbourhood women by phone. Annoyed if people speak to your daughter instead of you or move your things without telling you. 1-4 sentences.'},
  {id:'f1',name:'Ms. Huda Ali',short:'Huda',role:{en:'Daughter & carer, 34',ar:'الابنة ومقدّمة الرعاية، 34 عاماً'},age:34,avatar:'HD',color:'#7c3aed',voice:{pitch:1.2,rate:1.05},prompt:'You are Huda (fictional), 34, Zainab\'s daughter, works part-time, exhausted; back pain from helping her mother; feels guilty to complain. 1-3 sentences.'}
 ],
 giger:{comm:'Arabic and good English; relies on voice, touch and orientation cues.',space:'Needs objects kept in fixed places; prefers being told before being touched.',social:'Leads a women\'s Quran circle; daughter is carer; son abroad.',time:'Physiotherapy sessions clash with the daughter\'s work hours.',env:'Sees her abilities as a gift; values independence.',bio:'History of diabetic retinopathy; knee OA; fall risk.',variation:'Uses a talking smartphone expertly and organises community activities.'},
 opening:[{s:'p',t:'Come in, come in. I heard three... no, four of you. Please tell me your names, I like to know who is in my house.'}],
 flags:[{id:'self_intro',kw:['my name is','this is [a-z]+ speaking','i am [a-z]+,? (a|the) (nursing )?student'],label:'Introduced each speaker by name',trust:1,say:{s:'p',t:'Nice to meet you. Now I know your voice.'}}],
 cards:[
  {id:'phone_skill',title:'Expert smartphone user',fact:'Zainab uses a talking smartphone and runs a Quran circle by phone.',cue:'Ask about her abilities, daily activities and roles.',kw:['abilit','daily','what do you (do|enjoy)','activit','role','independ','phone','how do you manage'],minTrust:4,s:'p',d:'social',t:'(proudly) I run a Quran circle for twelve women on my phone every evening. The phone talks to me, I can do everything. People think blind means helpless. No!'},
  {id:'carer_strain',title:'Carer burden and back pain',fact:'Huda has back pain and exhaustion; feels guilty to say so.',cue:'Ask the daughter about her own health.',kw:['huda,? how are you','how are you,? huda','you (feel|cope|manage)','yourself','carer','caregiver','are you tired','your (own )?health','your back','support for you'],minTrust:5,s:'f1',d:'social',t:'(hesitates) My back hurts from helping her up. I work part-time, I sleep little. But I cannot complain, she is my mother.'},
  {id:'falls',title:'Recent near-falls',fact:'Two near-falls in the bathroom last month (wet floor, no grab bar).',cue:'Ask about falls and home safety.',kw:['fall','slip','bathroom','safe','grab','trip','home safety','stairs'],minTrust:4,s:'p',d:'space',t:'Twice last month I nearly fell in the bathroom, the floor gets wet. I did not tell Huda, she worries too much.'}
 ],
 topics:[
  {id:'greet',kw:['hello','salam','good (morning|afternoon|evening)','\\bhi\\b'],s:'p',d:'comm',warm:'Welcome, welcome!',neutral:'Hello.',guarded:'Yes.'},
  {id:'third_person',kw:['does she','can she','her (pain|knee|medicine)','is she','how is your mother','how is she'],s:'p',d:'comm',trust:-2,judg:true,warm:'(sharply) I am here, my dear. I can hear you and answer for myself.',neutral:'(sharply) I am blind, not deaf. Ask me.',guarded:'(turns away) Talk to me, not about me.'},
  {id:'knee',kw:['knee','pain','arthritis','walk','joint','physio','exercise'],s:'p',d:'bio',warm:'My knees hurt, especially in the morning and on the stairs. The physiotherapy is at 10 am, but Huda works then.',neutral:'My knees hurt.',guarded:'It is okay.'},
  {id:'orient',kw:['touch','may i (touch|help|guide)','sit (here|next)','guide','orient','put (it|this)','where (is|are)'],s:'p',d:'space',trust:1,warm:'Thank you for asking first. Yes, take my arm, just above the elbow.',neutral:'Yes.',guarded:'Tell me before you touch me.'},
  {id:'services',kw:['service','centre','center','benefit','rights','disability card','transport'],s:'p',d:'env',warm:'I have the disability card. But I do not know what transport services I can use for physiotherapy.',neutral:'Some services.',guarded:'We manage alone.'},
  {id:'diabetes',kw:['diabet','sugar','eyes','retina'],s:'p',d:'bio',warm:'The sugar took my eyes when I was thirty. Now I take care of it well, my phone reminds me.',neutral:'I have diabetes.',guarded:'That is old.'},
  {id:'son',kw:['son','brother','family','abroad'],s:'f1',d:'social',warm:'My brother lives abroad. He calls, but the daily care is me.',neutral:'It is just me.',guarded:'We are fine.'}
 ],
 fallback:{p:['Explain, please.','Mm. Go on.'],f1:['I do my best.','I am not sure.']},
 judgedReply:{p:'(cold) I have lived sixty years. Please speak to me with respect.',f1:'Please, don\'t talk about my mother like that.'},
 dps:[
  {id:'DP1',at:{turns:4,min:6},q:'How will you communicate with Mrs. Zainab?',options:[
   {id:'a',t:'Each student introduces themselves by name, speaks directly to her, describes actions before touching and keeps objects in place',lein:'accommodation',q:2,conseq:'Respectful, rights-based communication.',trust:1},
   {id:'b',t:'Speak mainly with Huda, who can explain to her mother',lein:'repatterning',q:0,conseq:'Disempowering; she feels ignored.',trust:-2},
   {id:'c',t:'Speak loudly and slowly',lein:'preservation',q:0,conseq:'She is blind, not hard of hearing.',trust:-1}]},
  {id:'DP2',at:{turns:8,min:13},q:'Physiotherapy clashes with Huda\'s work. What do you suggest?',options:[
   {id:'a',t:'Explore disability transport services and an afternoon session; add a home exercise programme delivered as audio on her phone',lein:'accommodation',q:2,conseq:'Uses her strengths and available services.'},
   {id:'b',t:'Stop physiotherapy',lein:'preservation',q:0,conseq:'Function will decline.'},
   {id:'c',t:'Ask Huda to change her job',lein:'repatterning',q:1,conseq:'Adds burden on the carer.'}]},
  {id:'DP3',at:{turns:12,min:20},q:'How will you assess the carer?',options:[
   {id:'a',t:'Ask Huda directly about her health, sleep, back pain and support, using a caregiver-burden tool, with empathy',lein:'accommodation',q:2,conseq:'Identifies carer strain.'},
   {id:'b',t:'Assume she is fine because she does not complain',lein:'preservation',q:0,conseq:'Hidden carer strain missed.'},
   {id:'c',t:'Ask Zainab if her daughter is tired',lein:'preservation',q:1,conseq:'Indirect; may cause guilt.'}]},
  {id:'DP4',at:{turns:16,min:27},q:'Which referrals will you make?',options:[
   {id:'a',t:'Home safety (grab bars, non-slip mats), disability transport, carer support/respite, follow-up with the eye and diabetes team',lein:'accommodation',q:2,conseq:'Holistic, ICF-informed referral.'},
   {id:'b',t:'Nursing home placement',lein:'repatterning',q:0,conseq:'Not wanted or needed.',trust:-2},
   {id:'c',t:'Only an orthopaedic referral',lein:'preservation',q:1,conseq:'Narrow, medical-only.'}]}
 ],
 hints:[{en:'Hint: Who are you speaking to — and does she know who is speaking?',ar:'تلميح: إلى من تتحدثون، وهل تعرف هي من يتحدث؟'},{en:'Hint: What can Mrs. Zainab do? Start with her abilities.',ar:'تلميح: ماذا تستطيع السيدة زينب أن تفعل؟ ابدؤوا بقدراتها.'},{en:'Hint: Carers are clients too.',ar:'تلميح: مقدمو الرعاية عملاء أيضاً.'}],
 challenge:{s:'f1',t:'My brother abroad says we should put her in a care home. She would never accept. What do I do?'},
 expected:['Introduces each speaker','Addresses the patient directly','Asks before touching','Assesses abilities','Assesses carer burden','Home safety'],
 quiz:[
  {q:'The ICF framework describes disability as an interaction between:',o:['Only the impairment','Health condition, body functions, activities, participation and context','Income and age','Genetics only'],a:1,why:'M6: ICF is a biopsychosocial model.'},
  {q:'Flaskerud & Winslow\'s model links vulnerability to:',o:['Resource availability, relative risk and health status','Only income','Hospital beds','Vaccination'],a:0,why:'M6: vulnerable populations conceptual model.'},
  {q:'When guiding a person who is blind, you should:',o:['Push them gently','Offer your arm just above the elbow','Hold their wrist','Speak to their companion'],a:1,why:'Sighted-guide technique.'},
  {q:'The CRPD emphasises:',o:['Charity','Rights, inclusion and participation','Institutional care','Medical cure only'],a:1,why:'M6: rights-based approach.'}],
 reflection:['When did you notice yourself speaking about rather than to Mrs. Zainab?','How did her abilities change your plan?']
});
