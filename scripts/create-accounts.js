#!/usr/bin/env node
/* Bulk-create TCS-Sim accounts in Supabase Auth + public.profiles.
   Usage:
     SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... node scripts/create-accounts.js [--students 80] [--team-size 5] [--facilitators 2] [--roster roster.csv] [--out /workspace/private] [--reset-passwords]
   - The service_role key is read ONLY from the environment. Never commit it or put it in the web app.
   - Output: <out>/accounts-YYYY-MM-DD.csv (username,password,role,student_code,team) with file mode 600. Keep it private.
   - Idempotent: existing users are kept (password unchanged unless --reset-passwords) and their profile is upserted. */
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const args=process.argv.slice(2); const arg=(k,d)=>{ const i=args.indexOf('--'+k); return i<0?d:(args[i+1]&&!args[i+1].startsWith('--')?args[i+1]:true); };
const URL_=(process.env.SUPABASE_URL||'').replace(/\/+$/,''), KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const DOMAIN=process.env.EMAIL_DOMAIN||'nur416.local';
if(!URL_||!KEY){ console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.'); process.exit(2); }
const N=+arg('students',80), SIZE=+arg('team-size',5), NF=+arg('facilitators',2), OUT=arg('out','/workspace/private'), RESET=!!arg('reset-passwords',false);
const ALPHA='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function password(){ // 14 chars, unambiguous alphabet + one symbol, crypto-random (~80 bits)
  const b=crypto.randomBytes(14); let s=''; for(let i=0;i<13;i++) s+=ALPHA[b[i]%ALPHA.length]; const sym='!@#%*-+'; return s.slice(0,7)+sym[b[13]%sym.length]+s.slice(7); }
const pad=(n,w)=>String(n).padStart(w,'0');
function roster(){
  const r=arg('roster',null);
  if(r&&r!==true){ return fs.readFileSync(r,'utf8').replace(/^\ufeff/,'').split(/\r?\n/).map(l=>l.split(',').map(x=>x.trim())).filter(c=>c[0]&&!/code|student/i.test(c[0])).map(c=>({code:c[0].toUpperCase(),team:(c[1]||'').toUpperCase(),consent:c[2]!=='0'})); }
  const w=Math.max(2,String(N).length), tw=Math.max(2,String(Math.ceil(N/SIZE)).length);
  return Array.from({length:N},(_,i)=>({code:'S'+pad(i+1,w),team:'T'+pad(Math.floor(i/SIZE)+1,tw),consent:true})); }
async function api(method,p,body,extra){ const res=await fetch(URL_+p,{method,headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',...(extra||{})},body:body?JSON.stringify(body):undefined});
  const txt=await res.text(); let j=null; try{ j=txt?JSON.parse(txt):null; }catch(e){} return {status:res.status,ok:res.ok,json:j,text:txt}; }
let userIndex=null;
async function findUser(email){ if(!userIndex){ userIndex={}; for(let page=1;;page++){ const r=await api('GET','/auth/v1/admin/users?page='+page+'&per_page=1000'); if(!r.ok) throw new Error('list users: '+r.status+' '+r.text); const us=(r.json&&r.json.users)||[]; us.forEach(u=>userIndex[u.email]=u); if(us.length<1000) break; } } return userIndex[email]; }
async function ensure(acc){
  const email=acc.username+'@'+DOMAIN;
  let r=await api('POST','/auth/v1/admin/users',{email,password:acc.password,email_confirm:true,user_metadata:{username:acc.username}});
  let id, created=true;
  if(r.ok) id=r.json.id||(r.json.user&&r.json.user.id);
  else if(r.status===422||/already|exists|registered/i.test(r.text)){ created=false; const u=await findUser(email); if(!u) throw new Error('exists but not found: '+email); id=u.id;
    if(RESET){ const up=await api('PUT','/auth/v1/admin/users/'+id,{password:acc.password}); if(!up.ok) throw new Error('reset '+email+': '+up.text); } else acc.password='(unchanged — existing account)'; }
  else throw new Error('create '+email+': '+r.status+' '+r.text);
  const prof={user_id:id,username:acc.username,role:acc.role,student_code:acc.code||null,team_code:acc.team||null,consent:acc.consent!==false}; if(created||RESET) prof.must_change_password=true;
  const p=await api('POST','/rest/v1/profiles?on_conflict=user_id',prof,{Prefer:'resolution=merge-duplicates,return=minimal'});
  if(!p.ok) throw new Error('profile '+acc.username+': '+p.status+' '+p.text);
  return created; }
(async()=>{
  const accounts=roster().map(s=>({username:s.code.toLowerCase(),password:password(),role:'student',code:s.code,team:s.team,consent:s.consent}));
  for(let i=1;i<=NF;i++) accounts.push({username:'fac'+i,password:password(),role:'facilitator'});
  let made=0, kept=0;
  for(const a of accounts){ try{ (await ensure(a))?made++:kept++; process.stdout.write('.'); }catch(e){ console.error('\n'+e.message); process.exitCode=1; a.password='(ERROR: '+e.message.slice(0,80)+')'; } }
  fs.mkdirSync(OUT,{recursive:true,mode:0o700});
  const file=path.join(OUT,'accounts-'+new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)+'.csv');
  const q=v=>/[",\n]/.test(v)?'"'+String(v).replace(/"/g,'""')+'"':String(v);
  fs.writeFileSync(file,'username,password,role,student_code,team\n'+accounts.map(a=>[a.username,a.password,a.role,a.code||'',a.team||''].map(q).join(',')).join('\n')+'\n',{mode:0o600,flag:'wx'});
  console.log(`\nCreated ${made}, existing ${kept}. Credentials written to ${file} (mode 600). Distribute individually; do not commit.`);
})();
