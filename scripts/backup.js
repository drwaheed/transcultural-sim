// Weekly research backup + Supabase keep-alive.  Run:  node scripts/backup.js
// Reads /workspace/private/supabase.env (service key, never committed). Writes /workspace/private/backups/<YYYY-MM-DD>/ (JSON + CSV per table).
// No passwords or keys are exported: profiles are reduced to non-secret columns; private_settings is never read.
const fs=require('fs'); const P='/workspace/private'; const E={}; fs.readFileSync(P+'/supabase.env','utf8').split('\n').forEach(l=>{const m=l.match(/^(\w+)=(.*)$/); if(m) E[m[1]]=m[2].trim();});
const U=E.SUPABASE_URL, K=E.SUPABASE_SERVICE_ROLE_KEY, H={apikey:K,Authorization:'Bearer '+K};
const TABLES={profiles:'username,role,student_code,team_code,consent,created_at',consents:'*',survey_responses:'*',observations:'*',external_measures:'*',sessions:'*',logs:'*',decisions:'*',module_progress:'*',quiz_results:'*',reflections:'*',review_state:'*',student_notes:'*',audit_log:'*',app_settings:'*',announcements:'*',schedules:'*'};
const day=new Date().toISOString().slice(0,10), out=P+'/backups/'+day; fs.mkdirSync(out,{recursive:true,mode:0o700});
const csvCell=v=>{ if(v==null) return ''; const s=typeof v==='object'?JSON.stringify(v):String(v); return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
async function all(t,sel){ const rows=[]; for(let from=0;;from+=1000){ const r=await fetch(U+'/rest/v1/'+t+'?select='+sel,{headers:{...H,Range:from+'-'+(from+999),'Range-Unit':'items'}}); if(!r.ok){ if(r.status===404) return null; throw new Error(t+' HTTP '+r.status); } const j=await r.json(); rows.push(...j); if(j.length<1000) break; } return rows; }
(async()=>{ const t0=Date.now(); const ping=await fetch(U+'/rest/v1/app_settings?select=key&limit=1',{headers:H}); console.log('keep-alive ping:',ping.status);
  const sum={}; for(const [t,sel] of Object.entries(TABLES)){ try{ const rows=await all(t,sel); if(!rows){ sum[t]='missing'; continue; }
      fs.writeFileSync(out+'/'+t+'.json',JSON.stringify(rows,null,1),{mode:0o600});
      const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(c=>!(t==='sessions'&&c==='data')); fs.writeFileSync(out+'/'+t+'.csv',[cols.join(','),...rows.map(r=>cols.map(c=>csvCell(r[c])).join(','))].join('\n'),{mode:0o600}); sum[t]=rows.length;
    }catch(e){ sum[t]='error: '+e.message; } }
  fs.writeFileSync(out+'/_manifest.json',JSON.stringify({created:new Date().toISOString(),project:U.replace(/^https:\/\/|\.supabase\.co.*$/g,''),tables:sum},null,1));
  console.log('backup →',out); console.log(sum); console.log('done in',Date.now()-t0,'ms'); })().catch(e=>{ console.error('backup failed:',e.message); process.exit(1); });
