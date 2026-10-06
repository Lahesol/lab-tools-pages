// Code-native SVG. No smoothing, no interpolation of missing measurements.
const NS='http://www.w3.org/2000/svg';
const element=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;return e;};
const finite=x=>Number.isFinite(x);
export function plot(svg,points,request,kind,fit){
  const xKey=kind==='sense'?'te_be_sense_V':'vcmd_minus_vmid_V',yKey=kind==='potential'?'te_be_sense_V':'current_mA';const data=points.filter(p=>finite(p[xKey])&&finite(p[yKey]));
  const endpoint=(request?.endpoint_mV||1000)/1000,xs=data.map(p=>p[xKey]),ys=data.map(p=>p[yKey]),lo=Math.min(0,endpoint,...xs),hi=Math.max(0,endpoint,...xs);
  let x0=Math.floor((lo-.04)/.2)*.2,x1=Math.ceil((hi+.04)/.2)*.2;if(x1-x0<.4)x1=x0+.4;
  let yl=Math.min(0,...ys),yh=Math.max(0,...ys);if(yh-yl<.05){yl-=.025;yh+=.025;}const margin=(yh-yl)*.1;yl-=margin;yh+=margin;
  const left=66,top=12,width=393,height=226,X=x=>left+(x-x0)/(x1-x0)*width,Y=y=>top+height-(y-yl)/(yh-yl)*height;
  svg.replaceChildren();svg.append(element('title',{},`${kind} — ${data.length}개 측정점`));
  for(let x=Math.ceil(x0/.2)*.2;x<=x1+.00001;x+=.2){svg.append(element('line',{x1:X(x),x2:X(x),y1:top,y2:top+height,stroke:'#e0e7ee','stroke-dasharray':'2 2'}),element('text',{x:X(x),y:top+height+20,'text-anchor':'middle'},Math.abs(x)<.00001?'0':x.toFixed(1)));}
  for(let k=0;k<=4;k++){const y=yl+(yh-yl)*k/4;svg.append(element('line',{x1:left,x2:left+width,y1:Y(y),y2:Y(y),stroke:'#e0e7ee','stroke-dasharray':'2 2'}),element('text',{x:left-9,y:Y(y)+4,'text-anchor':'end'},Math.abs(y)>=10?y.toFixed(1):y.toFixed(2)));}
  svg.append(element('path',{d:`M${left} ${top}V${top+height}H${left+width}`,fill:'none',stroke:'#8494a8'}));
  for(const [branch,color] of [['outward','#086a96'],['return','#b75a11']]){const d=data.filter(p=>branch==='outward'?p.index<=request?.n:p.index>=request?.n);if(d.length)svg.append(element('polyline',{points:d.map(p=>`${X(p[xKey])},${Y(p[yKey])}`).join(' '),fill:'none',stroke:color,'stroke-width':1.8}));}
  for(const p of data)if(p.compliance)svg.append(element('circle',{cx:X(p[xKey]),cy:Y(p[yKey]),r:3,fill:'#b52c31'}));
  if(kind==='sense'&&fit)for(const [name,color] of [['outward','#086a96'],['return_path','#b75a11']]){const f=fit[name];if(f.valid){let a=Math.max(x0,f.x_min),b=Math.min(x1,f.x_max);a=Math.max(a,(yl-f.intercept_mA)/f.slope_mA_per_V);b=Math.min(b,(yh-f.intercept_mA)/f.slope_mA_per_V);if(a<=b)svg.append(element('line',{x1:X(a),y1:Y(f.slope_mA_per_V*a+f.intercept_mA),x2:X(b),y2:Y(f.slope_mA_per_V*b+f.intercept_mA),stroke:color,'stroke-width':2,'stroke-dasharray':'5 4'}));}}
  if(!data.length)svg.append(element('text',{x:left+width/2,y:top+height/2,'text-anchor':'middle',class:'empty'},'측정 기록 없음'));
  svg.append(element('text',{x:left+width/2,y:286,'text-anchor':'middle',class:'axis-label'},kind==='sense'?'TE–BE sense (V)':'VCMD−V_MID (V)'),element('text',{transform:'translate(18 124) rotate(-90)','text-anchor':'middle',class:'axis-label'},kind==='potential'?'V_FB−V_MID (V)':'I (mA)'));
}
export function fitText(fit){if(!fit)return '측정 기록 없음';return [['outward','진행'],['return_path','복귀']].map(([k,label])=>{const f=fit[k],base=`${label} (${f.points}점, CC 제외 ${f.excluded_CC})`;if(!f.valid)return base+': '+f.reason;const unit=f.resistance_ohms>=1000?'kΩ':'Ω',factor=unit==='kΩ'?1000:1;return `${base}: R≈${(f.resistance_ohms/factor).toPrecision(3)} ± ${(f.resistance_se_ohms/factor).toPrecision(2)} ${unit} · R²=${f.r_squared.toFixed(3)} · ${f.reason}`;}).join('\n');}
