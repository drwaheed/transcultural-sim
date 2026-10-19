/* Accessible SVG charts (no dependencies). Each chart has role="img", an aria-label and a visually-hidden data table. */
(function(){
const T=window.TCS, esc=T.esc;
function wrap(svg, label, table){ return '<figure class="chart-fig" style="margin:0">'+svg.replace('<svg','<svg role="img" aria-label="'+esc(label)+'"')+(table?'<figcaption class="sr-only">'+table+'</figcaption>':'')+'</figure>'; }
function dataTable(head, rows){ return '<table><thead><tr>'+head.map(h=>'<th>'+(h===''||h==null?'<span class="sr-only">series</span>':esc(h))+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table>'; }
function line(points, opt){ // points [{x,y}] ; opt {w,h,ymin,ymax,xlabel,ylabel,label,step}
  opt=Object.assign({w:520,h:200,ymin:0,ymax:10,label:'line chart'},opt||{}); const P={l:34,r:10,t:10,b:28}; const W=opt.w-P.l-P.r,H=opt.h-P.t-P.b;
  const xs=points.map(p=>p.x), xmax=Math.max(1,...xs), sx=x=>P.l+W*(x/xmax), sy=y=>P.t+H*(1-(y-opt.ymin)/(opt.ymax-opt.ymin));
  let g='<g class="grid">'; for(let v=opt.ymin;v<=opt.ymax;v+=opt.ystep||2){ g+='<line x1="'+P.l+'" x2="'+(P.l+W)+'" y1="'+sy(v)+'" y2="'+sy(v)+'"/><text x="'+(P.l-6)+'" y="'+(sy(v)+4)+'" text-anchor="end">'+v+'</text>'; } g+='</g>';
  let d=''; points.forEach((p,i)=>{ const X=sx(p.x),Y=sy(p.y); if(i===0) d+='M'+X+' '+Y; else { if(opt.step!==false) d+=' H'+X; d+=' V'+Y; } }); if(points.length) d+=' H'+(P.l+W);
  const dots=points.map(p=>'<circle cx="'+sx(p.x)+'" cy="'+sy(p.y)+'" r="3.5" fill="var(--chart-1)"><title>'+esc(p.title||(p.x+': '+p.y))+'</title></circle>').join('');
  const ax='<text x="'+(P.l+W/2)+'" y="'+(opt.h-4)+'" text-anchor="middle">'+esc(opt.xlabel||'')+'</text>';
  const svg='<svg class="chart" viewBox="0 0 '+opt.w+' '+opt.h+'" xmlns="http://www.w3.org/2000/svg">'+g+'<path d="'+d+'" fill="none" stroke="var(--chart-1)" stroke-width="2.5"/>'+dots+ax+'</svg>';
  return wrap(svg,opt.label,dataTable([opt.xlabel||'x',opt.ylabel||'y'],points.map(p=>[p.x,p.y])));
}
function radar(series, axes, opt){ // series [{name,values:[0..100],color}] axes [label]
  opt=Object.assign({size:300,label:'radar chart',max:100},opt||{}); const S=opt.size, c=S/2, R=S/2-46, n=axes.length;
  const pt=(i,v)=>{ const a=-Math.PI/2+i*2*Math.PI/n; return [c+Math.cos(a)*R*v/opt.max, c+Math.sin(a)*R*v/opt.max]; };
  let g='<g class="grid">'; [25,50,75,100].forEach(v=>{ g+='<polygon points="'+axes.map((_,i)=>pt(i,v*opt.max/100).join(',')).join(' ')+'" fill="none" stroke="var(--border)"/>'; });
  axes.forEach((a,i)=>{ const [x,y]=pt(i,opt.max), [lx,ly]=pt(i,opt.max*1.2); g+='<line x1="'+c+'" y1="'+c+'" x2="'+x+'" y2="'+y+'" stroke="var(--border)"/><text x="'+lx+'" y="'+(ly+4)+'" text-anchor="middle">'+esc(a)+'</text>'; }); g+='</g>';
  const polys=series.map((s,k)=>'<polygon points="'+s.values.map((v,i)=>pt(i,v||0).join(',')).join(' ')+'" fill="'+(s.color||'var(--chart-'+(k+1)+')')+'" fill-opacity=".18" stroke="'+(s.color||'var(--chart-'+(k+1)+')')+'" stroke-width="2"><title>'+esc(s.name)+'</title></polygon>').join('');
  const svg='<svg class="chart" viewBox="0 0 '+S+' '+S+'" xmlns="http://www.w3.org/2000/svg" style="max-width:'+S+'px;margin:auto">'+g+polys+'</svg>';
  const leg='<div class="legend" aria-hidden="true">'+series.map((s,k)=>'<span><i style="background:'+(s.color||'var(--chart-'+(k+1)+')')+'"></i>'+esc(s.name)+'</span>').join('')+'</div>';
  return wrap(svg,opt.label,dataTable(['',...axes],series.map(s=>[s.name,...s.values.map(v=>v==null?'—':Math.round(v))])))+leg;
}
function bars(groups, seriesNames, opt){ // groups [{label, values:[]}]
  opt=Object.assign({w:560,h:220,max:100,label:'bar chart'},opt||{}); const P={l:34,r:8,t:10,b:34}; const W=opt.w-P.l-P.r,H=opt.h-P.t-P.b; const gw=W/Math.max(1,groups.length), bw=Math.min(28,(gw-10)/Math.max(1,seriesNames.length));
  let g='<g class="grid">'; for(let v=0;v<=opt.max;v+=opt.max/4){ const y=P.t+H*(1-v/opt.max); g+='<line x1="'+P.l+'" x2="'+(P.l+W)+'" y1="'+y+'" y2="'+y+'"/><text x="'+(P.l-6)+'" y="'+(y+4)+'" text-anchor="end">'+(+v.toFixed(1))+'</text>'; } g+='</g>';
  let b=''; groups.forEach((gr,i)=>{ const x0=P.l+i*gw+(gw-bw*seriesNames.length)/2; gr.values.forEach((v,k)=>{ if(v==null) return; const h=H*Math.min(1,v/opt.max); b+='<rect x="'+(x0+k*bw)+'" y="'+(P.t+H-h)+'" width="'+(bw-3)+'" height="'+h+'" rx="3" fill="var(--chart-'+(k+1)+')"><title>'+esc(gr.label+' — '+seriesNames[k]+': '+(+v).toFixed(1))+'</title></rect>'; }); b+='<text x="'+(P.l+i*gw+gw/2)+'" y="'+(opt.h-12)+'" text-anchor="middle">'+esc(gr.label)+'</text>'; });
  const svg='<svg class="chart" viewBox="0 0 '+opt.w+' '+opt.h+'" xmlns="http://www.w3.org/2000/svg">'+g+b+'</svg>';
  const leg='<div class="legend" aria-hidden="true">'+seriesNames.map((s,k)=>'<span><i style="background:var(--chart-'+(k+1)+')"></i>'+esc(s)+'</span>').join('')+'</div>';
  return wrap(svg,opt.label,dataTable(['',...seriesNames],groups.map(g=>[g.label,...g.values.map(v=>v==null?'—':(+v).toFixed(1))])))+leg;
}
function heat(v,max){ if(v==null||isNaN(v)) return 'background:var(--surface-2);color:var(--muted)'; const r=Math.max(0,Math.min(1,v/(max||100))); const dark=document.documentElement.dataset.theme==='dark';
  const h=Math.round(5+r*160); return dark?'background:hsl('+h+' 45% '+(18+r*10)+'%);color:#eaf6f4':'background:hsl('+h+' 60% '+(94-r*22)+'%);color:#10292c'; }
window.TCS_CHARTS={line,radar,bars,heat,dataTable};
})();
