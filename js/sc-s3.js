/* Scenario S3 (M3). All characters fictional. */
(window.TCS_SCENARIOS=window.TCS_SCENARIOS||[]).push({
 id:'S3', lecture:'M3', icon:'🍲', research:false, sensitive:false, trustStart:5, jargonPenalty:false,
 title:{en:'Outbreak after a community feast',ar:'تفشٍّ بعد وليمة'},
 setting:{en:'Shared workers\' accommodation (450 residents). After a celebration feast two days ago, 20 new cases of vomiting and diarrhoea are reported. The team investigates.',ar:'سكن عمال مشترك (450 مقيماً). بعد وليمة احتفالية قبل يومين، أُبلغ عن 20 حالة جديدة من القيء والإسهال. يحقق الفريق في التفشي.'},
 objectives:[{en:'Apply the epidemiological triangle (host, agent, environment).',ar:'تطبيق الثالوث الوبائي (المضيف والعامل والبيئة).'},{en:'Define a case and calculate an attack rate.',ar:'تعريف الحالة وحساب معدل الهجوم.'},{en:'Build culturally safe trust with fearful informants.',ar:'بناء الثقة بأمان ثقافي مع مخبرين خائفين.'}],
 personas:[
  {id:'p',name:'Mr. Yusuf Haddad',short:'Yusuf',role:{en:'Housing supervisor',ar:'مشرف السكن'},age:50,avatar:'YH',color:'#0f766e',voice:{pitch:0.85,rate:1},prompt:'You are Mr. Yusuf Haddad (fictional), 50, housing supervisor for a 450-resident workers\' accommodation. Cooperative, worried about the company\'s reputation. Knows: 20 new cases in 2 days, 180 attended the feast. 1-4 sentences.'},
  {id:'f1',name:'Mr. Anwar Hossain',short:'Anwar',role:{en:'Cook',ar:'الطاهي'},age:44,avatar:'AH',color:'#b45309',voice:{pitch:0.9,rate:0.95},prompt:'You are Mr. Anwar Hossain (fictional), 44, cook who prepared the feast: chicken biryani and a yoghurt raita kept outside for hours. Proud of your cooking; defensive if blamed; cooperative when asked about the process step by step. 1-3 sentences.'},
  {id:'f2',name:'Mr. Joseph Mathew',short:'Joseph',role:{en:'Worker (ill)',ar:'عامل (مريض)'},age:29,avatar:'JM',color:'#be185d',voice:{pitch:1,rate:1},prompt:'You are Mr. Joseph Mathew (fictional), 29, ill worker who hides it for fear of losing pay. Cooperates if confidentiality and job protection are reassured. 1-3 sentences.'}
 ],
 giger:{comm:'English, Bengali, Malayalam; workers may not report illness to supervisors.',space:'8–10 people per room; shared kitchen and bathrooms.',social:'Company hierarchy; peers as main support; feasts as important social events.',time:'Shift work; feast held two days ago in the evening.',env:'Fear of job loss shapes health-seeking; home remedies (rice water, salt-sugar water).',bio:'Young adult males; dehydration risk in heat.',variation:'The cook, though defensive, keeps a written notebook of all recipes and timings.'},
 opening:[{s:'p',t:'Thank you for coming quickly. We have many sick men since the celebration. The company is worried. Tell me what you need.'}],
 flags:[{id:'confidential',kw:['confidential','will not (tell|share|report your name)','won\'t (tell|share)','your job (is )?(safe|protected)','no one will know','anonymous','not (lose|affect) your (job|pay)'],label:'Confidentiality assured'}],
 cards:[
  {id:'hidden_cases',title:'Under-reported cases',fact:'At least 16 more ill workers are not reporting because they fear losing pay.',cue:'Assure confidentiality/job protection before asking ill workers about others.',kw:['others','roommate','friends','anyone else','more people','sick too','also ill'],minTrust:5,needFlags:['confidential'],s:'f2',d:'social',t:'(lowers voice) If you promise my name is not given... in my room alone, five are sick. Maybe sixteen more in the block. They are afraid to lose the day\'s pay.',blocked:'I don\'t know. I am fine.'},
  {id:'raita',title:'Yoghurt raita left in heat',fact:'The yoghurt raita sat outside at room temperature for about 5 hours; the biryani was reheated.',cue:'Ask the cook to describe the preparation step by step, without blaming.',kw:['prepar','how (did|was) (it|the food|everything) (made|cooked|prepared)','step','raita','yoghurt','yogurt','kept','store','refrigerat','temperature','fridge'],minTrust:5,nonJudg:true,s:'f1',d:'env',t:'I made everything with care, I have my notebook. The raita... we made it in the morning, it stayed outside on the table until dinner, maybe five hours. There was no space in the fridge.',blocked:'My food is clean! I cook for these men for ten years.'},
  {id:'water',title:'Water tank not checked',fact:'The rooftop water tank was last cleaned 8 months ago (alternative source to rule out).',cue:'Ask about environmental sources other than food.',kw:['water','tank','drink','tap','source'],minTrust:3,s:'p',d:'env',t:'The water tank on the roof... I think it was cleaned eight months ago. We drink bottled water mostly, but cooking uses the tank.'}
 ],
 topics:[
  {id:'greet',kw:['hello','salam','good (morning|evening|afternoon)','\\bhi\\b'],s:'p',d:'comm',warm:'Welcome, please come in.',neutral:'Hello.',guarded:'Yes, hello.'},
  {id:'numbers',kw:['how many','number','cases','residents','attend','total','people (ate|were)'],s:'p',d:'bio',warm:'450 residents. About 180 attended the feast. Since yesterday, 20 new sick men came to me.',neutral:'450 live here. 20 are sick.',guarded:'Some are sick.'},
  {id:'symptoms',kw:['symptom','vomit','diarr','fever','onset','start(ed)?','when did','pain'],s:'f2',d:'bio',warm:'It started at night, about 6 hours after dinner. Vomiting, stomach cramps, many trips to the toilet. No blood. A little fever.',neutral:'Vomiting and diarrhoea since night.',guarded:'Just stomach upset.'},
  {id:'feast',kw:['feast','celebrat','party','dinner','event'],s:'p',d:'time',warm:'It was a celebration for a colleague\'s promotion. Everyone was happy. Chicken biryani, raita, sweets.',neutral:'A small celebration.',guarded:'Just a dinner.'},
  {id:'menu',kw:['what (did|was) (they )?eat','menu','dishes','biryani','sweet','food'],s:'f1',d:'env',warm:'Chicken biryani, raita, salad, and sweets from the shop.',neutral:'Biryani and raita.',guarded:'Normal food.'},
  {id:'remedies',kw:['remed','treat(ed|ing)? (yourself|themselves)','\\bors\\b','rehydrat','rice water','medicine'],s:'f2',d:'env',warm:'We drink rice water and salt-sugar water, my mother taught me. Some take tablets from the shop.',neutral:'We drink water.',guarded:'Nothing.'},
  {id:'job',kw:['job','pay','salary','boss','lose','fired','sick leave'],s:'f2',d:'social',warm:'If I don\'t work, no pay. My family back home depends on this money.',neutral:'We need the pay.',guarded:'(silent)'},
  {id:'facilities',kw:['kitchen','toilet','bathroom','hand ?wash','soap','clean','hygiene','room'],s:'p',d:'space',warm:'One kitchen for each block, shared bathrooms. Soap is supplied, but sometimes it finishes.',neutral:'Shared kitchen and bathrooms.',guarded:'Everything is clean.'},
  {id:'languages',kw:['language','bengali','malayalam','translat','understand'],s:'p',d:'comm',warm:'Most speak Bengali or Malayalam. Notices are only in English and Arabic.',neutral:'Different languages.',guarded:'They understand enough.'}
 ],
 fallback:{p:['Please tell me what you need from me.','I can get you the list of residents.'],f1:['I cook. I do not know about this.','Ask me about the food.'],f2:['(looks away)','I am okay.']},
 judgedReply:{f1:'You are saying I poisoned them? I will not talk more.',p:'Let us not blame people, please.',f2:'(quiet) I should go back to work.'},
 dps:[
  {id:'DP1',at:{turns:4,min:6},q:'What is your case definition?',options:[
   {id:'a',t:'A resident or guest who attended the feast on that evening and developed vomiting or diarrhoea (≥3 loose stools/24h) within 72 hours',lein:'accommodation',q:2,conseq:'Clear person–place–time definition.'},
   {id:'b',t:'Anyone who feels unwell',lein:'preservation',q:0,conseq:'Too broad; inflates cases.'},
   {id:'c',t:'Only workers admitted to hospital',lein:'preservation',q:1,conseq:'Too narrow; misses most cases.'}]},
  {id:'DP2',at:{turns:8,min:13},q:'Of 180 attendees, 36 became ill (including newly found cases). What is the attack rate?',options:[
   {id:'a',t:'20% (36/180)',lein:'accommodation',q:2,conseq:'Correct: ill among exposed ÷ exposed.'},
   {id:'b',t:'8% (36/450)',lein:'preservation',q:0,conseq:'Uses the total population instead of the exposed group.'},
   {id:'c',t:'36 cases',lein:'preservation',q:1,conseq:'A count, not a rate.'}]},
  {id:'DP3',at:{turns:12,min:20},q:'What is your leading causal hypothesis?',options:[
   {id:'a',t:'Food-borne illness from the yoghurt raita kept at room temperature (agent: likely bacterial toxin; environment: heat, no refrigeration; host: dehydration risk)',lein:'accommodation',q:2,conseq:'Uses the triangle and evidence; test with food-specific attack rates.'},
   {id:'b',t:'The cook is careless',lein:'repatterning',q:0,conseq:'Blames a person, not a causal pathway.',trust:-1},
   {id:'c',t:'A virus brought from someone\'s home country',lein:'repatterning',q:0,conseq:'Stigmatising and not evidence-based.',trust:-1}]},
  {id:'DP4',at:{turns:16,min:27},q:'Which control measures will you recommend?',options:[
   {id:'a',t:'Report to public health; discard leftovers; hand hygiene and ORS education in residents\' languages; confidential case finding with no pay penalty; fridge capacity and food-safety training co-designed with the cook',lein:'accommodation',q:2,conseq:'Comprehensive, culturally safe, protects reporting.',say:{s:'f1',t:'If you help us get a bigger fridge, I will follow the rules. I want them healthy too.'}},
   {id:'b',t:'Close the kitchen and dismiss the cook',lein:'repatterning',q:0,conseq:'Punitive; discourages reporting.'},
   {id:'c',t:'Give antibiotics to all residents',lein:'repatterning',q:0,conseq:'Not indicated; antimicrobial resistance risk.'}]}
 ],
 hints:[{en:'Hint: Think person, place and time for your case definition.',ar:'تلميح: فكّروا في الشخص والمكان والزمان لتعريف الحالة.'},{en:'Hint: Frightened informants share more when they feel protected.',ar:'تلميح: المخبرون الخائفون يتكلمون أكثر حين يشعرون بالحماية.'},{en:'Hint: Ask about the process, not the person: how was each dish prepared and stored?',ar:'تلميح: اسألوا عن العملية لا عن الشخص.'}],
 challenge:{s:'p',t:'The company manager just called: he wants the names of all sick workers by tonight. What should I tell him?'},
 expected:['Uses the epidemiological triangle','Protects confidentiality','Asks about the food process non-judgmentally','Calculates a rate with the correct denominator'],
 quiz:[
  {q:'In the epidemiological triangle, "environment" refers to:',o:['The pathogen','External factors enabling transmission','The person\'s genetics','The vaccine'],a:1,why:'M3: environment includes physical, social and biological external factors.'},
  {q:'Incidence measures:',o:['All existing cases','New cases in a population at risk over a period','Deaths only','Cases in hospitals'],a:1,why:'M3: incidence counts new cases over time.'},
  {q:'Prevalence is best described as:',o:['New cases only','All existing cases at a point/period','Attack rate','Case fatality'],a:1,why:'M3: prevalence includes existing cases.'},
  {q:'The attack-rate denominator is:',o:['Total population','People exposed','People hospitalised','Healthy people'],a:1,why:'Attack rate = ill among exposed ÷ total exposed.'}],
 reflection:['How did fear of job loss affect data quality?','How did you avoid blaming the cook while still identifying the cause?']
});
