// v83 wire contract. Raw codes remain unchanged; conversions are derived only.
export const REVISION = 'v84-web1';
export const SCALE = 3.6 / 16384;
export const DIVIDERS = [2,1,1,1,2,1,2,1];
export const NAMES = ['TE_I','BE_I','V_CC+','V_CC−','V_FB','V_IS','V_CMD','V_MID'];
export const GPIO = [['A0','P1.06'],['A1','P1.04'],['A2','P1.02'],['A3','P1.07'],['CS','P1.05'],['WR_A','P1.13'],['WR_B','P0.14'],['EN_A','P1.11'],['EN_B','P0.15'],['ADG884 IN','P1.10'],['IN mirror','P1.12'],['DAC DIN','P0.11'],['DAC SCLK','P0.12'],['DAC SYNC','P0.08'],['DAC LDAC','P0.07']];
export const STATUS = ['완료','0 V 범위 검사 실패','ADC 포화 / V_MID 범위 이상','표본 전류가 보호 한계 초과','route watchdog / 시간 한도','ADC 또는 HF clock 오류','CC 기준전압 불일치','SAFE / 연결 종료에 따른 중단','CC 도달','중립 복귀 범위 검사 실패','FORCE 한도 / FORCE–피드백 불일치','PU/PD 방향 확인 실패','연결 후 0 V 범위 검사 실패'];
export function check(ok, message) { if (!ok) throw new Error(message); }
export function integer(value) { check(/^-?\d+$/.test(String(value)), '정수 필드 형식'); const n=Number(value); check(Number.isSafeInteger(n),'정수 범위'); return n; }
export function b64decode(s) {
  check(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s), 'base64 형식');
  return Uint8Array.from(atob(s), c=>c.charCodeAt(0));
}
export function b64encode(bytes) { let s=''; for (const v of bytes) s+=String.fromCharCode(v); return btoa(s); }
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes, initial=0) { let c=(initial^0xffffffff)>>>0;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0; }
export function adcValues(raw, bits=14) {
  check(raw.length===8 && [12,14].includes(bits),'ADC 8채널/해상도 불일치');
  const volts=raw.map((x,i)=>x*(3.6/(2**bits))*DIVIDERS[i]);
  return {volts,current_mA:(volts[5]-volts[7])/.08,feedback_V:volts[4]-volts[7],force_V:volts[0]-volts[1],cc_plus_mA:(volts[2]-volts[7])/.08,cc_minus_mA:(volts[7]-volts[3])/.08,near_rail:raw.some(x=>x<0||x>=4091*(2**(bits-12)))};
}
export function decodeAdc(line) { const [prefix,s]=line.split(',');check(['A12','A14'].includes(prefix),'ADC header');const b=b64decode(s);check(b.length===16,'ADC 길이');const d=new DataView(b.buffer);return {bits:Number(prefix.slice(1)),raw:Array.from({length:8},(_,i)=>d.getInt16(i*2,true))}; }
export function limits(plus,minus) { const a=[Number(plus),Number(minus)];check(a.every(Number.isFinite)&&a[0]>=.2&&a[0]<=3&&a[1]>=.2&&a[1]<=12,'CC+ 0.2–3 mA / CC− 0.2–12 mA');return a.map(x=>Math.round(x*1000)); }
export function targetMV(value,absolute,profile) { let n=Number(value);check(Number.isFinite(n),'VCMD 숫자 확인');if(absolute)n-=profile.safe_code*profile.vref_b_mV/4096;n=Math.round(n);check(n>=-1000&&n<=3000,'VCMD SAFE 기준 −1000..+3000 mV');return n; }
export function sweepRequest(dut,endpoint,step,dwell,plus,minus) {
  dut=integer(dut);endpoint=integer(endpoint);step=integer(step);const us=Math.round(Number(dwell)*1000);
  check(dut>=1&&dut<=30&&[1000,3000,-1000].includes(endpoint),'DUT / sweep 범위');
  check(step>=1&&step<=500&&Number.isFinite(us)&&us>=1000&&us<=1000000,'step 1–500 mV, 대기 1–1000 ms');
  const n=Math.ceil((Math.abs(endpoint)-20)/step);check(n<=200,'401점 제한: step을 늘리세요.');check((2*n+1)*(us+40000)<=180000000,'MCU 실행시간 180초 제한');
  return {dut,endpoint_mV:endpoint,step_mV:step,dwell_us:us,cc_uA:endpoint>0?plus:minus,n,expected_points:2*n+1,start_mV:endpoint>0?20:-20,excluded_inner_band_mV:20};
}
export const commandFor=r=>`SWP,${r.dut},${Number(r.endpoint_mV>0)},${Math.abs(r.endpoint_mV)},${r.step_mV},${r.dwell_us}`;
// Capture transmission is separate from MCU measurement time. Default ATT
// payload is 20 bytes; allow bounded 75 ms connection intervals per fragment.
// No extra measurements, automatic retries, or relaxed capture checks.
export function sweepTimeoutMs(r,kind){const measurement=r.expected_points*(r.dwell_us+40000)/1000,scRecords=Math.ceil((304+104*r.expected_points)/12),bleTransfer=(r.expected_points*6+scRecords*2+16)*75;return measurement+60000+(kind==='ble'?bleTransfer:0);}
export class BleAssembler {
  buffer=null;
  feed(data) {
    check(data.every(x=>x<128),'BLE non-ASCII');const s=new TextDecoder().decode(data);
    if(!s.startsWith('~')) {if(this.buffer!==null){this.buffer=null;throw new Error('BLE fragment 누락');}return s.trim();}
    if(data.length<3||data.length>20||!['S','C','E'].includes(s[1])){this.buffer=null;throw new Error('BLE fragment 형식');}
    if(s[1]==='S'){if(this.buffer!==null){this.buffer=null;throw new Error('BLE start 중복');}this.buffer=s.slice(2);return null;}
    check(this.buffer!==null,'BLE fragment start 없음');this.buffer+=s.slice(2);
    if(this.buffer.length>96){this.buffer=null;throw new Error('BLE record 길이');}
    if(s[1]==='E'){const line=this.buffer;this.buffer=null;return line.trim();}return null;
  }
}
export class SweepPreview {
  constructor(request){this.request={...request};this.token=null;this.complete=false;this.records=[];this.points=[];this.status=null;this.firmware=null;}
  feed(line){
    const p=line.split(','),r=this.request;
    if(p[1]==='H'){
      check(p.length===6&&this.token===null&&[82,83,84].includes(integer(p[2])),'SP header/version/duplicate');
      const [token,dut,total]=p.slice(3).map(integer);check(token>0&&token<=0xffffffff&&dut===r.dut&&total===r.expected_points,'SP 요청 불일치');this.token=token;this.firmware=integer(p[2]);return;
    }
    check(this.token!==null&&!this.complete,'SP 순서');
    if(p[1]==='D'){
      check(p.length===(this.firmware>=83?13:10),'SP 필드 수');const [token,index,code,applied,frames,...sums]=p.slice(2).map(integer);
      check(token===this.token&&index===this.records.length&&index<r.expected_points,'SP index/token 누락/중복');
      check(code>=0&&code<=4095&&applied>=0&&applied<=0xffffffff&&frames===3&&sums.every(v=>v>=-32768*3&&v<=32767*3),'SP 범위');
      check(!this.records.length||applied>=this.records.at(-1).applied_us,'SP 시간 순서');
      const target=Math.min(20+(index<=r.n?index:2*r.n-index)*r.step_mV,Math.abs(r.endpoint_mV))*Math.sign(r.endpoint_mV);
      const [cmd,mid,vis,fb,te,be]=sums,current=(vis-mid)*SCALE/3/.08;
      this.records.push({index,code,applied_us:applied,frames,sums});
      this.points.push({index,target_mV:target,vcmd_minus_vmid_V:(2*cmd-mid)*SCALE/3,current_mA:current,settled_frames:3,compliance:Math.abs(current)>=.9*r.cc_uA/1000,...(this.firmware>=83?{te_be_sense_V:(2*fb-mid)*SCALE/3,force_V:(2*te-be)*SCALE/3}:{})});return;
    }
    check(p[1]==='E'&&p.length===5,'SP end 형식');const [token,count,status]=p.slice(2).map(integer);check(token===this.token&&count===this.records.length&&STATUS[status]!==undefined,'SP end 불일치');this.complete=true;this.status=status;
  }
  verify(d){
    check(this.complete&&d.complete,'Preview/final capture 불완전');check(d.meta.firmware===this.firmware&&d.meta.status===this.status,'SP/SC status/version');
    const expected=this.status===0?d.points.length:Math.max(0,d.points.length-1);check([expected,d.points.length].includes(this.records.length),'SP/SC 점 수');
    this.records.forEach((rec,i)=>{const p=d.points[i],fs=p.frames.filter(f=>f.phase==='settled');check(fs.length===3&&rec.index===p.index&&rec.code===p.code&&rec.applied_us===p.applied_us,'SP/SC point identity');[6,7,5,...(this.firmware>=83?[4,0,1]:[])].forEach((ch,j)=>check(rec.sums[j]===fs.reduce((s,f)=>s+f.raw_codes[ch],0),'SP/SC raw 합계 불일치'));});
    return {verified:true,token:this.token,points:this.records.length,status:this.status,method:'exact integer ADC sums/code/timestamp vs CRC-verified SC raw'};
  }
}
export class SweepDecoder {
  constructor(request){this.request={...request};this.payload=new Uint8Array();this.started=false;this.complete=false;this.firmware=null;this.meta={};this.points=[];}
  feed(line){const p=line.split(',');
    if(p[1]==='H'){check(p.length===3&&[81,82,83,84].includes(integer(p[2]))&&!this.started,'SC header');this.started=true;this.firmware=integer(p[2]);return;}
    check(this.started&&!this.complete,'SC 순서');
    if(p[1]==='D'){check(p.length===4&&integer(p[2])===this.payload.length,'SC offset 누락/중복');const b=b64decode(p[3]);check(b.length>=1&&b.length<=12&&b.length+this.payload.length<=42008,'SC 길이');const next=new Uint8Array(b.length+this.payload.length);next.set(this.payload);next.set(b,this.payload.length);this.payload=next;return;}
    check(p[1]==='E'&&p.length===4&&/^[0-9a-fA-F]{8}$/.test(p[3]),'SC end 형식');check(integer(p[2])===this.payload.length&&parseInt(p[3],16)===crc32(this.payload),'SC 길이/CRC 불일치');this.decode();this.complete=true;
  }
  decode(){
    const b=this.payload,r=this.request;check(b.length>=304,'SC header 불완전');const d=new DataView(b.buffer,b.byteOffset,b.byteLength),u16=o=>d.getUint16(o,true),u32=o=>d.getUint32(o,true);
    const magic=u32(0),dut=u16(4),cc=u16(6),n=u16(8),frames=u16(10),dwell=u32(12),status=u16(16),count=u16(18),on=u32(20),park=u32(24),gate=u32(28);
    const ref=u16(32),neutral=u16(34),mask=u16(36),max=u16(38),returns=u16(40),modeword=u16(42),return_us=u32(44),mode=modeword&3,step=modeword>>>2;
    check(magic===0x31384353&&frames===4&&mask===81&&[2,3].includes(mode)&&dut===r.dut&&cc===r.cc_uA&&n===r.n&&step===r.step_mV&&dwell===r.dwell_us&&max===Math.abs(r.endpoint_mV)&&(mode===3)===(r.endpoint_mV>0)&&ref>=4500&&ref<=5500&&neutral*ref>=1150*4096&&neutral*ref<=1350*4096&&count<=2*n+1&&STATUS[status]!==undefined&&b.length===304+104*count&&returns<=8,'SC metadata / 요청 불일치');
    const raw=o=>Array.from({length:8},(_,i)=>d.getInt16(o+i*2,true));const zero_count=(gate>>>8)&255;check(zero_count<=8,'SC 영점 frame 수');
    let previous=on;this.points=[];
    for(let i=0;i<count;i++){
      const off=304+104*i,code=u16(off),pupd=d.getUint8(off+2),nf=d.getUint8(off+3),applied=u32(off+4);
      check(nf<=4&&code<=4095&&[0,1].includes(pupd)&&applied>=previous,'SC point 순서/범위');
      const target=Math.min(20+(i<=n?i:2*n-i)*step,max)*(mode===3?1:-1),expected=neutral+Math.floor((Math.abs(target)*4096+Math.floor(ref/2))/ref)*Math.sign(target);
      check(code===expected&&pupd===Number(mode===3),'SC DAC / 극성');const fs=[];
      for(let f=0;f<nf;f++){const fo=off+8+24*f,start=u32(fo),end=u32(fo+4);check(start>=applied&&end>=start&&start>=previous&&(!f||start>=applied+dwell),'SC ADC 시간/dwell 순서');previous=end;fs.push({phase:f?'settled':'guard',start_us:start,end_us:end,raw_codes:raw(fo+8)});}
      this.points.push({index:i,target_mV:target,code,pupd,applied_us:applied,frames:fs});
    }
    check(status!==0||(count===2*n+1&&returns===8&&zero_count===8&&(gate&1)&&this.points.every(p=>p.frames.length===4)&&on&&park>=previous&&return_us>=park&&(gate&(1<<24))),'SC 완료/park-before-neutral 증거 누락');
    this.meta={firmware:this.firmware,adc_bits:14,average_samples:16,status,status_text:STATUS[status],dut,cc_uA:cc,step_mV:step,dwell_us:dwell,point_count:count,expected_points:2*n+1,warnings:(gate>>>16)&255,precheck_frames:Array.from({length:zero_count},(_,i)=>raw(48+i*16)),return_parked_frames:Array.from({length:returns},(_,i)=>raw(176+i*16)),connect_us:on,park_us:park,return_us,vref_b_mV:ref,safe_code:neutral,crc32:crc32(b).toString(16).padStart(8,'0'),return_state:'S16 neutral / compliance held; NOT connected DUT zero'};
  }
}
export const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
export function electricalPoints(d){check(d.complete,'CRC-verified raw required');return d.points.flatMap(p=>{const v=p.frames.filter(f=>f.phase==='settled').map(f=>adcValues(f.raw_codes));if(!v.length)return [];const current=mean(v.map(x=>x.current_mA));return [{index:p.index,target_mV:p.target_mV,vcmd_minus_vmid_V:mean(v.map(x=>x.volts[6]-x.volts[7])),te_be_sense_V:mean(v.map(x=>x.feedback_V)),force_V:mean(v.map(x=>x.force_V)),current_mA:current,settled_frames:v.length,compliance:Math.abs(current)>=.9*d.meta.cc_uA/1000,fit_eligible:v.length===3&&!v.some(x=>x.near_rail)}];});}
export function branchFit(points,n,branch,maxAbs=.3){
  const limit=Number(maxAbs);check(Number.isFinite(limit)&&limit>=.02&&limit<=3.5,'선형 근사 범위 |TE–BE| 0.02–3.5 V');
  const candidates=points.filter(p=>branch==='outward'?p.index<=n:p.index>=n),selected=candidates.filter(p=>p.fit_eligible!==false&&!p.compliance&&Number.isFinite(p.te_be_sense_V)&&Number.isFinite(p.current_mA)&&Math.abs(p.te_be_sense_V)<=limit);
  const summary={branch,points:selected.length,indices:selected.map(p=>p.index),max_abs_V:limit,excluded_CC:candidates.filter(p=>p.compliance).length,model:'I[mA] = slope[mA/V]*TE_BE_sense[V] + intercept[mA]',resistance_ohms:null,valid:false};
  const fail=reason=>({...summary,reason});if(selected.length<5)return fail('근사 가능한 non-CC 점이 5개 미만');
  const x=selected.map(p=>p.te_be_sense_V),y=selected.map(p=>p.current_mA),lo=Math.min(...x),hi=Math.max(...x),span=hi-lo;if(span<.05)return fail('감지 전압 범위가 50 mV 미만');
  const mx=mean(x),my=mean(y),sxx=x.reduce((s,v)=>s+(v-mx)**2,0),syy=y.reduce((s,v)=>s+(v-my)**2,0),slope=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0)/sxx,intercept=my-slope*mx,sse=x.reduce((s,v,i)=>s+(y[i]-slope*v-intercept)**2,0),se=Math.sqrt(sse/(x.length-2)/sxx),r2=syy>0?1-sse/syy:null;
  Object.assign(summary,{slope_mA_per_V:slope,intercept_mA:intercept,slope_se:se,r_squared:r2,voltage_span_V:span,x_min:lo,x_max:hi,residual_rms_mA:Math.sqrt(sse/x.length)});
  if(slope<=0)return fail('양의 전도도 없음 (open/노이즈/비선형 가능)');if(slope<=3*se||slope*span<.02197265625)return fail('기울기 불확실 / 전류 변화가 검출 하한 수준');
  return {...summary,valid:true,resistance_ohms:1000/slope,resistance_se_ohms:1000*se/slope**2,reason:r2!==null&&r2>=.9?'선형 근사':'비선형 응답: 참고용 선형 근사'};
}
export function fitSweep(points,r,limit=.3){return {schema:'rram-linear-resistance-v1',max_abs_V:Number(limit),origin_forced:false,raw_unchanged:true,CC_points_excluded:true,outward:branchFit(points,r.n,'outward',limit),return_path:branchFit(points,r.n,'return',limit)};}
export function confirmedDut(state,mux){if(!state||!mux||mux.length!==6||mux[5]!==1)return null;const dut=mux[4],en=dut<=15?[0,1]:[1,0];return dut>=1&&dut<=30&&state[0]===dut&&mux[0]===en[0]&&mux[1]===en[1]&&mux[2]===en[0]&&mux[3]===en[1]?dut:null;}
export function safeReadback(state,mux,profile){return Boolean(profile&&state&&mux&&state[0]===0&&state[1]===0&&state[2]===profile.safe_code&&mux[2]===0&&mux[3]===1&&mux[5]===0);}
