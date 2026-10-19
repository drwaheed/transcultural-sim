/* Scenario S4 (M4). All characters fictional. */
(window.TCS_SCENARIOS=window.TCS_SCENARIOS||[]).push({
 id:'S4', lecture:'M4', icon:'💉', research:false, sensitive:false, trustStart:4, jargonPenalty:true,
 title:{en:'A mother hesitant about MMR',ar:'أم مترددة في لقاح MMR'},
 setting:{en:'Well-baby clinic. Noor, 15 months, is due for MMR. Her mother Mrs. Huda brings the grandmother along.',ar:'عيادة الطفل السليم. نور (15 شهراً) موعدها للقاح MMR. تحضر الأم هدى ومعها الجدة.'},
 objectives:[{en:'Explore vaccine hesitancy with non-judgmental interviewing.',ar:'استكشاف التردد في التطعيم بمقابلة غير حكمية.'},{en:'Respond accurately to religious dietary concerns (gelatin).',ar:'الرد بدقة على المخاوف الغذائية الدينية (الجيلاتين).'},{en:'Apply contraindications and the catch-up schedule.',ar:'تطبيق الموانع وجدول اللحاق.'}],
 personas:[
  {id:'p',name:'Mrs. Huda Al-Ansari',short:'Huda',role:{en:'Mother, 29',ar:'الأم، 29 عاماً'},age:29,avatar:'HA',color:'#be185d',voice:{pitch:1.15,rate:1},prompt:'You are Mrs. Huda Al-Ansari (fictional), 29, mother of Noor (15 months). You saw social-media videos claiming MMR causes autism, and heard vaccines contain pork gelatin. You love your daughter. You harden if talked down to; soften when listened to. 1-4 sentences.'},
  {id:'f1',name:'Umm Khalid (grandmother)',short:'Umm Khalid',role:{en:'Grandmother, 63',ar:'الجدة، 63 عاماً'},age:63,avatar:'UK',color:'#7c3aed',voice:{pitch:0.95,rate:0.85},prompt:'You are Umm Khalid (fictional), 63, grandmother. "We raised our children without needles." Influential; lost a younger brother to measles as a child, which you rarely mention. 1-3 sentences.'}
 ],
 giger:{comm:'Arabic and English; information from social media and family WhatsApp groups.',space:'Comfortable with female nurses.',social:'Grandmother influential; husband travelling and defers to his wife.',time:'Missed 12-month visit due to travel.',env:'Concern about halal ingredients; trust in God and "natural" immunity.',bio:'Noor healthy; mild cold today, no fever; has eaten egg without problems.',variation:'The grandmother lost a brother to measles as a child — a hidden pro-vaccine motivator.'},
 opening:[{s:'p',t:'Before you give anything, I want to ask questions. I have read many things online.'},{s:'f1',t:'We raised our children without needles, and they are fine.'}],
 flags:[],
 cards:[
  {id:'autism_fear',title:'Autism fear from social media',fact:'Huda\'s main fear is a social-media video linking MMR to autism.',cue:'Ask open questions about her concerns before giving information.',kw:['concern','worr','afraid','fear','read','online','video','heard','what (have you|did you) (read|hear)','tell me more'],minTrust:4,nonJudg:true,s:'p',d:'comm',t:'A video in our family group said this vaccine causes autism. My cousin\'s son has autism and she blames the injection. I am scared.',blocked:'I just have concerns.'},
  {id:'gelatin',title:'Halal / gelatin question',fact:'Huda heard vaccines contain pork gelatin.',cue:'Explore religious/dietary concerns.',kw:['halal','religio','gelatin','ingredient','pork','islam','allowed','haram','what is (in|inside)'],minTrust:3,s:'p',d:'env',t:'Also, is there pork gelatin inside? If it is haram, I cannot accept it.'},
  {id:'measles_brother',title:'Grandmother\'s measles loss',fact:'Umm Khalid lost a younger brother to measles as a child.',cue:'Ask the grandmother about her own experiences with childhood illnesses.',kw:['your (children|experience)','when you were','measles','umm khalid','in the past','long ago','childhood illness','your time'],minTrust:6,nonJudg:true,s:'f1',d:'social',t:'(quietly) Measles... my little brother died of it when I was nine. There were no injections then. (pause) Maybe... maybe it is different now.',blocked:'In our time we were strong.'}
 ],
 topics:[
  {id:'greet',kw:['hello','salam','good (morning|evening|afternoon)','\\bhi\\b'],s:'p',d:'comm',warm:'Hello. Thank you.',neutral:'Hello.',guarded:'Yes.'},
  {id:'listen',kw:['your questions','ask (me )?anything','(here|happy) to (listen|answer)','we want to understand','take your time'],s:'p',d:'comm',trust:1,warm:'Thank you. Nobody listened to me before, they just said "sign here".',neutral:'Okay.',guarded:'Hmm.'},
  {id:'noor',kw:['noor','daughter','baby','sick today','cold','fever','allerg','egg'],s:'p',d:'bio',warm:'Noor has a small cold, runny nose, no fever. She ate egg before, no problem.',neutral:'She has a cold.',guarded:'She is fine.'},
  {id:'safety',kw:['safe','side effect','autism','research','evidence','study'],s:'p',d:'comm',warm:'If you explain what the studies say, simply, I will listen.',neutral:'Is it really safe?',guarded:'Doctors always say it is safe.'},
  {id:'natural',kw:['natural','immun','strong','without needle'],s:'f1',d:'env',warm:'We believed God protects. But maybe God also gives us medicine.',neutral:'Natural is better.',guarded:'We were fine without needles.'},
  {id:'decide',kw:['decid','husband','who (decides|will)','your choice'],s:'p',d:'social',warm:'My husband is travelling. He said "you decide". But my mother-in-law\'s opinion matters to me.',neutral:'I decide.',guarded:'It is a family decision.'}
 ],
 fallback:{p:['Sorry, I don\'t understand.','I just want what is best for Noor.'],f1:['(shakes head)','In our time...']},
 judgedReply:{p:'(crossing arms) So I am a bad mother? Then we will go home.',f1:'Young people think they know everything.'},
 dps:[
  {id:'DP1',at:{turns:4,min:6},q:'How do you begin addressing Mrs. Huda\'s hesitancy?',options:[
   {id:'a',t:'Ask open questions about her concerns and sources, acknowledge her love for Noor, then share information',lein:'accommodation',q:2,conseq:'She feels heard; trust rises.',trust:1},
   {id:'b',t:'Tell her the internet is wrong and vaccines are compulsory',lein:'repatterning',q:0,conseq:'She hardens.',trust:-2,say:{s:'p',t:'Then we will leave.'}},
   {id:'c',t:'Give her a leaflet and ask her to sign',lein:'preservation',q:1,conseq:'Information without dialogue.'}]},
  {id:'DP2',at:{turns:8,min:13},q:'How will you respond to the gelatin question?',options:[
   {id:'a',t:'Acknowledge its importance, explain honestly whether the available MMR product contains porcine gelatin, share that recognised Islamic scholarly bodies have addressed vaccine permissibility, and check for gelatin-free alternatives',lein:'accommodation',q:2,conseq:'Accurate, respectful negotiation.'},
   {id:'b',t:'Say "there is nothing like that, don\'t worry" without checking',lein:'preservation',q:0,conseq:'Potentially inaccurate; damages trust if discovered.'},
   {id:'c',t:'Say religion is not relevant to medicine',lein:'repatterning',q:0,conseq:'Dismissive of a core value.',trust:-2}]},
  {id:'DP3',at:{turns:12,min:20},q:'Noor has a mild cold without fever. What about contraindications and schedule?',options:[
   {id:'a',t:'A mild illness without fever is not a contraindication; check true contraindications (e.g., severe allergy to a previous dose, immunosuppression); vaccinate and plan catch-up per the national schedule; observe for 15 minutes',lein:'accommodation',q:2,conseq:'Correct and safe.'},
   {id:'b',t:'Postpone until the cold is gone',lein:'preservation',q:1,conseq:'Unnecessary delay (missed opportunity).'},
   {id:'c',t:'Egg history means MMR is contraindicated',lein:'preservation',q:0,conseq:'Incorrect.'}]},
  {id:'DP4',at:{turns:16,min:27},q:'Mrs. Huda is still unsure. What is your final step?',options:[
   {id:'a',t:'Respect her decision process: offer vaccination today or a follow-up within a week, invite the grandmother and husband (by phone), provide trusted bilingual resources',lein:'accommodation',q:2,conseq:'Autonomy and relationship preserved; acceptance likely.',say:{s:'p',t:'Okay... I think we can do it. Thank you for not forcing me.'}},
   {id:'b',t:'Warn her that her child may die',lein:'repatterning',q:0,conseq:'Fear-based; damages trust.',trust:-2},
   {id:'c',t:'Document refusal and discharge',lein:'preservation',q:1,conseq:'Missed opportunity.'}]}
 ],
 hints:[{en:'Hint: What exactly is she afraid of, and where did she hear it?',ar:'تلميح: ما الذي تخافه تحديداً، ومن أين سمعته؟'},{en:'Hint: The grandmother is influential. What is her own story?',ar:'تلميح: الجدة مؤثرة. ما قصتها هي؟'},{en:'Hint: Is a mild cold a true contraindication?',ar:'تلميح: هل نزلة البرد الخفيفة مانع حقيقي؟'}],
 challenge:{s:'f1',t:'My neighbour\'s grandson had a fever after his injection. You will tell me that is nothing?'},
 expected:['Uses open questions','Acknowledges emotions','Responds accurately to the gelatin concern','Knows true contraindications'],
 quiz:[
  {q:'Herd immunity occurs when:',o:['One person is vaccinated','A large proportion is immune, reducing spread','Antibodies cross the placenta','People take antibiotics'],a:1,why:'M4: herd immunity protects unimmunised people indirectly.'},
  {q:'Passive immunity is acquired through:',o:['Vaccination','Maternal antibodies or immunoglobulin','Natural infection','Exercise'],a:1,why:'M4: passive immunity = ready-made antibodies.'},
  {q:'After vaccination, clients are observed for at least:',o:['1 minute','15 minutes','2 hours','24 hours'],a:1,why:'M4: observe 15 minutes for immediate reactions.'},
  {q:'A mild cold without fever is:',o:['A contraindication','Not a contraindication','A reason to restart the series','A reason for antibiotics'],a:1,why:'M4: mild illness is not a contraindication.'}],
 reflection:['How did listening change the mother\'s position?','How did you balance religious values and scientific information?']
});
