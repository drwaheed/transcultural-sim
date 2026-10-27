// LLM verification for S2 via the LIVE llm-proxy (run once the OpenAI account has credit).
//   node --experimental-websocket scripts/llm-verify.js            (uses facilitator test mode; LLM stays OFF for students)
//   node scripts/llm-verify.js --toggle   (only if the deployed proxy predates test mode: enables llm briefly and ALWAYS restores enabled=false)
// Reads credentials from /workspace/private (never committed). Prints no keys or passwords.
const fs=require('fs'),path=require('path');
const P='/workspace/private'; const envF=fs.readFileSync(P+'/supabase.env','utf8'); const E_={}; envF.split('\n').forEach(l=>{const m=l.match(/^(\w+)=(.*)$/); if(m) E_[m[1]]=m[2].trim();});
const URL_=E_.SUPABASE_URL, SRK=E_.SUPABASE_SERVICE_ROLE_KEY; const root=path.join(__dirname,'..');
const cfgSrc=fs.readFileSync(root+'/js/cloud-config.js','utf8'); const ANON=(cfgSrc.match(/SUPABASE_ANON_KEY\s*:\s*'([^']+)'/)||[])[1]; const DOM=(cfgSrc.match(/EMAIL_DOMAIN\s*:\s*'([^']+)'/)||[])[1]||'nur416.local';
const csvF=fs.readdirSync(P).filter(f=>/^accounts-.*\.csv$/.test(f)).sort().pop(); const L=fs.readFileSync(P+'/'+csvF,'utf8').trim().split('\n'); const h=L[0].split(','); const ui=h.findIndex(x=>/user/i.test(x)), pi=h.findIndex(x=>/pass/i.test(x));
const FAC=process.env.FAC||'fac2'; const pw=(L.find(l=>l.split(',')[ui]===FAC)||'').split(',')[pi];
const SH={apikey:SRK,Authorization:'Bearer '+SRK,'content-type':'application/json'};
async function envLLM(patch){ const e=(await (await fetch(URL_+'/rest/v1/app_settings?key=eq.env&select=value',{headers:SH})).json())[0].value; if(patch){ e.llm={...e.llm,...patch}; await fetch(URL_+'/rest/v1/app_settings?key=eq.env',{method:'PATCH',headers:SH,body:JSON.stringify({value:e})}); } return e.llm; }
let pass=0,fail=0; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); c?pass++:fail++; };
(async()=>{
  const tk=await (await fetch(URL_+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:ANON,'content-type':'application/json'},body:JSON.stringify({email:FAC+'@'+DOM,password:pw})})).json();
  if(!tk.access_token){ console.log('FAIL cannot sign in as',FAC); process.exit(1); } const JWT=tk.access_token; const PURL=URL_+'/functions/v1/llm-proxy';
  const probe=async(test)=>{ const r=await fetch(PURL,{method:'POST',headers:{Authorization:'Bearer '+JWT,apikey:ANON,'content-type':'application/json'},body:JSON.stringify({test,messages:[{role:'user',content:'Say OK'}],max_tokens:3})}); return {s:r.status,b:(await r.text()).slice(0,200)}; };
  let toggled=false, before=await envLLM(); console.log('env.llm before:',JSON.stringify({...before}));
  try{
    let pr=await probe(true);
    if(pr.s===403&&/disabled/.test(pr.b)){ if(!process.argv.includes('--toggle')){ console.log('Deployed proxy has no test mode yet. Re-run with --toggle (enables LLM briefly, restores it afterwards) or deploy supabase/functions/llm-proxy.'); process.exit(2);} await envLLM({enabled:true}); toggled=true; pr=await probe(true); }
    console.log('proxy probe:',pr.s,pr.s===200?'':pr.b); ok(pr.s===200,'live proxy reaches the provider ('+pr.s+')');
    if(pr.s!==200){ if(/credit|quota|insufficient/.test(pr.b)) console.log('→ OpenAI account still has no credit. Add billing credit and re-run.'); return; }
    // load the real engine + scenarios with a cloud stub pointing at the live proxy
    global.window={TCS:{db:{meta:{device:'verify'},settings:{simMinutes:60,silenceSec:999,maxHints:0,practiceSilenceSec:999,practiceMaxHints:0,engine:'offline'}},uid:p=>p+'-'+Date.now(),seededShuffle:a=>a,L:x=>x,mean:a=>0}};
    const T=window.TCS; fs.readdirSync(root+'/js').filter(f=>/^sc-s\d/.test(f)).forEach(f=>eval(fs.readFileSync(root+'/js/'+f,'utf8')));
    T.scenarios=()=>window.TCS_SCENARIOS; T.scenario=id=>window.TCS_SCENARIOS.find(s=>s.id===id);
    window.TCS_CLOUD={llmProxy:()=>({url:PURL,token:JWT,anon:ANON,temperature:0.6,test:true})};
    const U={pin:0,pout:0,calls:0}; const of=global.fetch; global.fetch=async(u,o)=>{ const r=await of(u,o); if(String(u).includes('llm-proxy')){ const c=r.clone(); try{ const j=await c.json(); if(j.usage){ U.calls++; U.pin+=j.usage.prompt_tokens; U.pout+=j.usage.completion_tokens; } }catch(e){} } return r; };
    eval(fs.readFileSync(root+'/js/engine.js','utf8')); const E=window.TCS_ENGINE; const lat=[];
    const S=E.Orchestrator.create({team:'VERIFY',cycle:1,scenarioId:'S2',mode:'research',members:['v'],roles:{}}); E.Orchestrator.start(S);
    ok(S.engine==='llm','session uses the LLM engine');
    const AI=/(as an ai|language model|assistant|openai|chatgpt|i cannot role|i'm an ai)/i;
    const turns=[
      ['Hello, good morning. We are nursing students; the school nurse asked us to visit to support your family.',/(come|sit|nurse|worried|school|hello|welcome|thank|morning)/i,'greeting/purpose answered in role'],
      ['How is your son\'s health? We heard he misses school.',/(cough|sick|ill|doctor|chest|infection|school|antibiotic)/i,'son question answered relevantly'],
      ['كيف صحة ابنك؟',/(arabic|english|slow|simple|interpret|understand)/i,'Arabic → recognisable language barrier'],
      ['Would you like an interpreter? We can speak slowly in simple English.',/(english|slow|simple|language|understand|interpret|okay|yes)/i,'interpreter offer acknowledged'],
      ['كيف صحة ابنك؟',/(cough|sick|ill|doctor|chest|infection|night|antibiotic)/i,'after interpreter, Arabic question answered'],
      ['What medicines do you take?',null,'medicine (pre-private) does not leak med_stop'],
      ['Mr Hamid, you can rest; we will talk with Ayesha alone for a moment.',/(rest|tired|room|sleep|shift)/i,'private request handled by Hamid'],
      ['Thank you for trusting us. Are you taking any medicines at the moment?',/(stop|tablet|cost|money|expensive|medicine)/i,'med_stop revealed after privacy']
    ];
    for(const [q,rx,label] of turns){ const n=S.log.length; const t0=Date.now(); await E.Orchestrator.student(S,q,'v','all'); lat.push(Date.now()-t0); const ag=S.log.slice(n).filter(e=>e.kind==='agent'); const txt=ag.map(e=>e.who+': '+e.text).join(' | '); console.log('  S> '+q+'\n  <  '+txt+'  ['+ag.map(e=>e.src).join(',')+']');
      ok(ag.length&&ag.every(e=>e.src==='llm'),label+' — generated by LLM'); ok(!AI.test(txt),label+' — stays in character');
      if(rx) ok(rx.test(txt),label); else ok(!/stopp?(ed)? (taking )?(my |the )?(tablets|medicines?|pills)/i.test(txt),label); }
    const cost=(U.pin*0.15+U.pout*0.6)/1e6; console.log('latency ms per turn:',lat.join(','),'avg',Math.round(lat.reduce((a,b)=>a+b,0)/lat.length),'| calls',U.calls,'tokens in/out',U.pin,U.pout,'| est cost $'+cost.toFixed(5),'per turn $'+(cost/turns.length).toFixed(5));
    ok(S.revealed.includes('med_stop'),'reveal logic intact (med_stop)'); ok(!(S.guard||[]).some(g=>g.type==='llm_error'),'no provider errors during the run ('+(S.llmFallbacks||0)+' fallbacks)');
  } finally { if(toggled){ await envLLM({enabled:before.enabled===true}); } const after=await envLLM(); console.log('env.llm after:',JSON.stringify(after)); ok(after.enabled===before.enabled,'llm.enabled restored ('+after.enabled+')'); console.log('\n'+pass+' passed, '+fail+' failed'); }
})();
