import {check,integer,roundEven,b64decode,crc32,STATUS} from './protocol.js';
export function pulseRequest(dut,mV,width){dut=integer(dut);const mv=roundEven(Number(mV)),us=integer(width);check(String(mV).trim()!==''&&Number.isFinite(mv)&&dut>=1&&dut<=30&&Math.abs(mv)>=20&&mv>=-1000&&mv<=3000,'Pulse: DUT1–30, −1000..−20 또는 +20..+3000 mV');check(us>=1&&us<=1000000,'Pulse 폭 1–1000000 µs');return {dut,target_mV:mv,width_us:us};}
export const pulseCommand=r=>`PULSE86,${r.dut},${Number(r.target_mV>0)},${Math.abs(r.target_mV)},${r.width_us}`;
export const PULSE_PHASE=['S16 neutral precheck','S16 biased precheck','guard bracket inside pulse','guard bracket overlapping park','S16 neutral postcheck'];
export class PulseDecoder {
  constructor(request){this.request=request;this.payload=new Uint8Array();this.started=false;this.complete=false;this.frames=[];this.meta={};}
  feed(line){const p=line.split(',');if(p[1]==='H'){check(p.join(',')==='PL,H,86'&&!this.started,'PL header');this.started=true;return;}
    check(this.started&&!this.complete&&p[0]==='PL','PL order');
    if(p[1]==='D'){check(p.length===4&&integer(p[2])===this.payload.length,'PL offset');const data=b64decode(p[3]);check(data.length>0&&data.length<=12&&this.payload.length+data.length<=1856,'PL size');const next=new Uint8Array(this.payload.length+data.length);next.set(this.payload);next.set(data,this.payload.length);this.payload=next;return;}
    check(p.length===4&&p[1]==='E'&&integer(p[2])===this.payload.length&&/^[a-fA-F0-9]{8}$/.test(p[3])&&parseInt(p[3],16)===crc32(this.payload),'PL CRC/length');this.decode();this.complete=true;
  }
  decode(){const b=this.payload;check(b.length>=64,'PL header size');const v=new DataView(b.buffer,b.byteOffset,b.byteLength),u=o=>v.getUint32(o,true),r=this.request;
    const status=u(8),dut=u(12),sign=u(16),mv=u(20),width=u(24),cc=u(28),ref=u(32),safe=u(36),code=u(40),on=u(44),off=u(48),count=u(52),flags=u(60);
    check(u(0)===0x36384c50&&u(4)===86&&status<STATUS.length&&u(56)===14&&count<=64&&b.length===64+28*count&&sign<=1&&flags<=3,'PL metadata');
    check(dut===r.dut&&width===r.width_us&&(sign?mv:-mv)===r.target_mV,'PL request mismatch');
    check(cc===r.cc_uA&&ref===r.vref_b_mV&&safe===r.safe_code,'PL profile / compliance mismatch');
    const expected=safe+(sign?1:-1)*Math.floor((mv*4096+Math.floor(ref/2))/ref);check(code===expected&&code>=0&&code<=4095,'PL DAC code');
    check((on===0&&off===0)||(on>0&&off-on===width),'PL scheduled edges');
    this.frames=[];let last=0;for(let i=0;i<count;i++){const o=64+i*28,start=u(o),end=u(o+4),phase=v.getUint16(o+8,true),guard=v.getUint16(o+10,true);check(start>=last&&end>=start&&phase<=4&&guard<STATUS.length,'PL frame order');
      if(phase===2)check(start>on&&end<off,'PL in-pulse bracket');
      this.frames.push({start_us:start,end_us:end,phase,phase_text:PULSE_PHASE[phase],guard_status:guard,raw_codes:Array.from({length:8},(_,ch)=>v.getInt16(o+12+ch*2,true))});last=end;
    }
    if(status===0)check(flags===3&&on>0&&count>=12&&this.frames.filter(f=>f.phase===0).length===8&&this.frames.filter(f=>f.phase===1).length===2&&this.frames.filter(f=>f.phase===4).length===2&&this.frames.every(f=>f.guard_status===0),'PL completion evidence');
    this.meta={firmware:86,status,status_text:STATUS[status],dut,target_mV:sign?mv:-mv,width_us:width,cc_uA:cc,vref_b_mV:ref,safe_code:safe,dac_code:code,scheduled_on_us:on,scheduled_off_us:off,frame_count:count,adc_bits:14,timer_completed:Boolean(flags&1),safe_internal:Boolean(flags&2),in_pulse_frames:this.frames.filter(f=>f.phase===2).length,crc32:crc32(b).toString(16).padStart(8,'0'),timing_is_schedule_not_measured_analogue_edge:true};
  }
}
