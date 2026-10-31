// PL89: neutral-only handover, retained CC/direction S16 idle. No analogue QA.
import {check,integer,b64decode,crc32,STATUS} from './protocol.js';
import {pulseRequest} from './dacpulse88.js';
export {pulseRequest};
export const pulseCommand=r=>'PULSE89,'+[r.dut,Number(r.target_mV>0),Math.abs(r.target_mV),r.width_us].join(',');
export const DAC_PULSE_PHASE=['S16 before neutral handover','S16 direction-ready precheck','DUT near-neutral precheck','guard bracket inside DAC pulse','guard bracket overlapping return','DUT SAFE return held','S16 retained-state postcheck'];
export const PULSE_EVENT=['unused','entry','S16 ready','CC write begin','CC write end','zero verified before direction','direction write begin','direction write end','neutral direction ready','DUT connect begin','DUT connect end','target input register preloaded','timer results observed','reserved','return verified / park begin','S16 park end','retained S16 idle','fault / full SAFE begin'];
export const logicalCC=ua=>Math.min(4095,ua>38?Math.floor(((ua-38)*564+481)/962):0);
export const physicalCC=ua=>ua*80<=13680?0:Math.floor(((ua*80-13680)*564+173160)/346320);
export function parkPulseReadback(s,m,p,g,x){return Boolean(p&&s&&m&&g&&x?.park_retained_internal&&s[0]===0&&s[1]===logicalCC(x.cc_uA)&&s[2]===p.safe_code&&s[3]===Number(x.target_mV>0)&&m.length===6&&m.every((v,i)=>v===[0,1,0,1,0,0][i])&&(g[0]&0x1ff)===0x17f&&((g[0]>>9)&3)===(x.target_mV>0?3:0));}
export class DacPulseDecoder {
  constructor(request){this.request=request;this.payload=new Uint8Array();this.started=false;this.complete=false;this.frames=[];this.events=[];this.meta={};}
  feed(line){const p=line.split(',');if(p[1]==='H'){check(p.join(',')==='PL,H,89'&&!this.started,'PL89 header');this.started=true;return;}
    check(this.started&&!this.complete&&p[0]==='PL','PL89 order');
    if(p[1]==='D'){check(p.length===4&&integer(p[2])===this.payload.length,'PL89 offset');const d=b64decode(p[3]);check(d.length>0&&d.length<=12&&this.payload.length+d.length<=2752,'PL89 size');const n=new Uint8Array(this.payload.length+d.length);n.set(this.payload);n.set(d,this.payload.length);this.payload=n;return;}
    check(p.length===4&&p[1]==='E'&&integer(p[2])===this.payload.length&&/^[a-fA-F0-9]{8}$/.test(p[3])&&parseInt(p[3],16)===crc32(this.payload),'PL89 CRC/length');this.decode();this.complete=true;
  }
  decode(){const b=this.payload;check(b.length>=128,'PL89 header size');const v=new DataView(b.buffer,b.byteOffset,b.byteLength),u=o=>v.getUint32(o,true),r=this.request;
    const hold=u(96),park=u(100),checks=u(104),returned=u(108),ec=u(112),status=u(8),dut=u(12),sign=u(16),mv=u(20),width=u(24),cc=u(28),ref=u(32),safe=u(36),code=u(40),on=u(44),off=u(48),count=u(52),flags=u(60),baseline=u(64),spi=u(68),amount=u(72);
    check(hold===100000&&checks<=8&&ec<=24&&u(0)===0x39384c50&&u(4)===89&&status<STATUS.length&&u(56)===14&&count<=80&&b.length===128+28*count+16*ec&&sign<=1&&flags<=127&&(flags&8)&&u(92)===0x484f4c44,'PL89 metadata');
    check(dut===r.dut&&width===r.width_us&&(sign?mv:-mv)===r.target_mV,'PL89 request mismatch');pulseRequest(dut,sign?mv:-mv,width);
    check(cc===r.cc_uA&&ref===r.vref_b_mV&&safe===r.safe_code&&u(116)===safe&&u(120)<=4095&&u(124)<=1,'PL89 profile / entry mismatch');
    check(code===safe+(sign?1:-1)*Math.floor((mv*4096+Math.floor(ref/2))/ref)&&code>=0&&code<=4095&&baseline===safe,'PL89 DAC code');
    check(u(76)===1000000&&u(80)===32&&u(84)-u(80)===width*16&&u(88)===20000,'PL89 timer/DMA configuration');
    check((on===0&&off===0)||(on>0&&off-on===width),'PL89 scheduled edges');
    this.frames=[];let last=0,phaseLast=0;for(let i=0;i<count;i++){const o=128+i*28,start=u(o),end=u(o+4),phase=v.getUint16(o+8,true),guard=v.getUint16(o+10,true);check(start>=last&&end>=start&&phase<=6&&phase>=phaseLast&&guard<STATUS.length,'PL89 frame order');
      if(phase===3)check(start>on&&end<off,'PL89 in-pulse bracket');if(status===0&&phase<3)check(end<=on,'PL89 neutral bracket');if(status===0&&phase===5)check(start>=off,'PL89 return bracket');
      this.frames.push({start_us:start,end_us:end,phase,phase_text:DAC_PULSE_PHASE[phase],guard_status:guard,raw_codes:Array.from({length:8},(_,ch)=>v.getInt16(o+12+ch*2,true))});last=end;phaseLast=phase;
    }
    this.events=[];last=0;for(let i=0;i<ec;i++){const o=128+28*count+i*16,t=u(o),id=v.getUint16(o+4,true),logical=v.getUint16(o+6,true),physical=v.getUint16(o+8,true),cmd=v.getUint16(o+10,true),dir=v.getUint8(o+12),selected=v.getUint8(o+13),connected=v.getUint8(o+14),gpio=v.getUint8(o+15);
      check(t>=last&&id>=1&&id<=17&&logical<=4095&&physical<=4095&&cmd<=4095&&dir<=1&&selected<=30&&connected<=1&&gpio<=15,'PL89 trace metadata');
      this.events.push({us:t,event:id,event_text:PULSE_EVENT[id],cc_code:logical,physical_cc_code:physical,vcmd_code:cmd,direction:dir,selected_dut:selected,connected:Boolean(connected),gpio_bits:gpio,timing:'CPU observation, not physical edge'});last=t;
    }
    if(status===0){check(checks===8&&returned===off&&park>=off+hold&&park<off+250000,'PL89 held-route return evidence');check(this.frames.filter(f=>f.phase===5).every(f=>f.start_us>=off+hold&&f.end_us<=park)&&this.frames.filter(f=>f.phase===6).every(f=>f.start_us>=park),'PL89 park bracket');
      check(flags===127&&on>0&&count>=34&&[0,1,2,5].every(p=>this.frames.filter(f=>f.phase===p).length===8)&&this.frames.filter(f=>f.phase===6).length===2&&this.frames.every(f=>f.guard_status===0),'PL89 completion evidence');check(amount===2&&spi>on&&spi+2<off,'PL89 DMA return preload');
      const end=this.events.at(-1),ready=this.events.find(e=>e.event===8),route=this.events.find(e=>e.event===10);check(this.events[0]?.event===1&&ready&&route&&end?.event===16,'PL89 trace stages');
      check(end.cc_code===logicalCC(cc)&&end.physical_cc_code===physicalCC(cc)&&end.direction===sign&&end.vcmd_code===safe&&!end.connected&&!end.selected_dut&&end.gpio_bits===(sign?14:2),'PL89 retained idle proof');
      check(ready.us<=route.us&&route.us<=on&&!ready.connected&&!ready.selected_dut&&ready.direction===sign&&route.connected&&route.selected_dut===dut,'PL89 admission trace');
      for(const e of this.events)if(e.event!==1)check(e.vcmd_code===safe,'PL89 nonzero preparation command');
      for(const e of this.events.filter(e=>[6,7].includes(e.event)))check(!e.connected&&!e.selected_dut&&(e.gpio_bits&3)===2,'PL89 direction outside S16');
    }
    this.meta={firmware:89,pulse_mode:'DAC_LDAC_NEUTRAL_HANDOVER_RETAINED_S16',status,status_text:STATUS[status],dut,target_mV:sign?mv:-mv,width_us:width,cc_uA:cc,vref_b_mV:ref,safe_code:safe,dac_code:code,baseline_code:baseline,scheduled_on_us:on,scheduled_off_us:off,frame_count:count,event_count:ec,adc_bits:14,timer_completed:Boolean(flags&1),park_internal:Boolean(flags&2),safe_internal:Boolean(flags&2)&&!(flags&32),park_retained_internal:Boolean(flags&32),neutral_direction_verified:Boolean(flags&64),entry_cc_code:u(120),entry_direction:u(124),route_held_through_return:Boolean(flags&16),return_hold_us:hold,return_checks:checks,parked_at_us:park,return_capture_us:returned,neutral_dma_verified:Boolean(flags&4),spi_end_us:spi,spi_tx_bytes:amount,spi_frequency_Hz:u(76),timer_on_ticks:u(80),timer_off_ticks:u(84),in_pulse_frames:this.frames.filter(f=>f.phase===3).length,crc32:crc32(b).toString(16).padStart(8,'0'),timing_is_schedule_not_measured_analogue_edge:true};
  }
}
