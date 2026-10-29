// v87 DAC-output pulse only. pulse.js is retained for read-only v86 archives.
import {check,integer,b64decode,crc32,STATUS} from './protocol.js';
import {pulseRequest as legacyRequest} from './pulse.js';
export function pulseRequest(dut,mV,width){const r=legacyRequest(dut,mV,width);check(r.width_us>=100,'DAC Pulse 폭 100–1000000 µs');return r;}
export const pulseCommand=r=>`PULSE87,${r.dut},${Number(r.target_mV>0)},${Math.abs(r.target_mV)},${r.width_us}`;
export const DAC_PULSE_PHASE=['S16 near-neutral precheck','DUT near-neutral precheck','guard bracket inside DAC pulse','guard bracket overlapping return','S16 neutral postcheck'];
export class DacPulseDecoder {
  constructor(request){this.request=request;this.payload=new Uint8Array();this.started=false;this.complete=false;this.frames=[];this.meta={};}
  feed(line){const p=line.split(',');if(p[1]==='H'){check(p.join(',')==='PL,H,87'&&!this.started,'PL87 header');this.started=true;return;}
    check(this.started&&!this.complete&&p[0]==='PL','PL87 order');
    if(p[1]==='D'){check(p.length===4&&integer(p[2])===this.payload.length,'PL87 offset');const data=b64decode(p[3]);check(data.length>0&&data.length<=12&&this.payload.length+data.length<=2336,'PL87 size');const next=new Uint8Array(this.payload.length+data.length);next.set(this.payload);next.set(data,this.payload.length);this.payload=next;return;}
    check(p.length===4&&p[1]==='E'&&integer(p[2])===this.payload.length&&/^[a-fA-F0-9]{8}$/.test(p[3])&&parseInt(p[3],16)===crc32(this.payload),'PL87 CRC/length');this.decode();this.complete=true;
  }
  decode(){const b=this.payload;check(b.length>=96,'PL87 header size');const v=new DataView(b.buffer,b.byteOffset,b.byteLength),u=o=>v.getUint32(o,true),r=this.request;
    const status=u(8),dut=u(12),sign=u(16),mv=u(20),width=u(24),cc=u(28),ref=u(32),safe=u(36),code=u(40),on=u(44),off=u(48),count=u(52),flags=u(60),baseline=u(64),spiEnd=u(68),amount=u(72),frequency=u(76),onTicks=u(80),offTicks=u(84);
    check(u(0)===0x37384c50&&u(4)===87&&status<STATUS.length&&u(56)===14&&count<=80&&b.length===96+28*count&&sign<=1&&flags<=15&&(flags&8)&&u(92)===0x444143,'PL87 metadata');
    check(dut===r.dut&&width===r.width_us&&(sign?mv:-mv)===r.target_mV,'PL87 request mismatch');pulseRequest(dut,sign?mv:-mv,width);
    check(cc===r.cc_uA&&ref===r.vref_b_mV&&safe===r.safe_code,'PL87 profile / compliance mismatch');
    const expected=safe+(sign?1:-1)*Math.floor((mv*4096+Math.floor(ref/2))/ref);check(code===expected&&code>=0&&code<=4095&&baseline===safe+(sign?1:-1),'PL87 DAC code');
    check(frequency===1000000&&onTicks===32&&offTicks-onTicks===width*16&&u(88)===20000,'PL87 timer/DMA configuration');
    check((on===0&&off===0)||(on>0&&off-on===width),'PL87 scheduled edges');
    this.frames=[];let last=0,lastPhase=0;for(let i=0;i<count;i++){const o=96+i*28,start=u(o),end=u(o+4),phase=v.getUint16(o+8,true),guard=v.getUint16(o+10,true);check(start>=last&&end>=start&&phase<=4&&phase>=lastPhase&&guard<STATUS.length,'PL87 frame order');
      if(phase===2)check(start>on&&end<off,'PL87 in-pulse bracket');
      if(status===0&&phase<2)check(end<=on,'PL87 neutral precheck bracket');
      if(status===0&&phase===4)check(start>=off,'PL87 postcheck bracket');
      this.frames.push({start_us:start,end_us:end,phase,phase_text:DAC_PULSE_PHASE[phase],guard_status:guard,raw_codes:Array.from({length:8},(_,ch)=>v.getInt16(o+12+ch*2,true))});last=end;lastPhase=phase;
    }
    if(status===0){check(flags===15&&on>0&&count>=18&&this.frames.filter(f=>f.phase===0).length===8&&this.frames.filter(f=>f.phase===1).length===8&&this.frames.filter(f=>f.phase===4).length===2&&this.frames.every(f=>f.guard_status===0),'PL87 completion evidence');check(amount===2&&spiEnd>on&&spiEnd+2<off,'PL87 neutral DMA not completed before return');}
    this.meta={firmware:87,pulse_mode:'DAC_LDAC_TIMER3_PPI',status,status_text:STATUS[status],dut,target_mV:sign?mv:-mv,width_us:width,cc_uA:cc,vref_b_mV:ref,safe_code:safe,dac_code:code,baseline_code:baseline,scheduled_on_us:on,scheduled_off_us:off,frame_count:count,adc_bits:14,timer_completed:Boolean(flags&1),safe_internal:Boolean(flags&2),neutral_dma_verified:Boolean(flags&4),spi_end_us:spiEnd,spi_tx_bytes:amount,spi_frequency_Hz:frequency,timer_on_ticks:onTicks,timer_off_ticks:offTicks,in_pulse_frames:this.frames.filter(f=>f.phase===2).length,crc32:crc32(b).toString(16).padStart(8,'0'),timing_is_schedule_not_measured_analogue_edge:true};
  }
}
