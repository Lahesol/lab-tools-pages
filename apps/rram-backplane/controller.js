import {REVISION,STATUS,check,integer,decodeAdc,limits,targetMV,sweepRequest,commandFor,SweepDecoder,SweepPreview,electricalPoints,fitSweep,confirmedDut,safeReadback,b64encode} from './protocol.js';
import {BoardTransport} from './transport.js';
export const newId=label=>new Date().toISOString().replace(/[:.]/g,'-')+'_'+label+'_'+crypto.randomUUID().slice(0,8);
export class Controller {
  constructor(journal,changed,log){Object.assign(this,{journal,changed,log,firmware:null,adcInfo:null,profile:null,state:null,mux:null,gpio:null,raw:null,readback:false,busy:false,loggingFailed:false,epoch:0,waiter:null,capture:null,session:null});this.seq=0;this.monitorUs=250000;
    this.transport=new BoardTransport((source,bytes)=>this.record({kind:'bytes',direction:'rx',source,base64:b64encode(bytes)}),line=>this.line(line),e=>this.fault(e));}
  async initSession(kind){this.session=newId(kind);this.seq=0;this.readback=false;this.firmware=null;this.adcInfo=null;this.profile=null;this.state=null;this.mux=null;this.gpio=null;this.raw=null;await this.journal.run({id:this.session,kind:'session',gui_revision:REVISION,started_at_utc:new Date().toISOString(),transport:kind});}
  async record(data){try{const at_utc=new Date().toISOString(),record={run_id:this.session,seq:this.seq++,at_utc,...data};await this.journal.append(record);if(this.capture){const r={...record,run_id:this.capture.id,seq:this.capture.seq++};await this.journal.append(r);}return record;}catch(e){this.loggingFailed=true;throw new Error('raw 자동 저장 실패: '+e.message);}}
  async connectUsb(port){await this.initSession('usb');await this.transport.connectUsb(port);await this.handshake();}
  async connectBle(device){await this.initSession('ble');await this.transport.connectBle(device);await this.handshake();}
  ready(){return Boolean(this.transport.kind&&this.readback&&!this.loggingFailed&&this.firmware===83&&this.adcInfo?.[0]===14&&this.profile);}
  guard(){check(this.ready(),'VER83 / ADC14 / HW 및 자동 저장 확인 후 제어 가능합니다.');}
  async operation(label,fn){check(!this.busy,'현재 작업이 끝난 뒤 실행하세요.');check(this.transport.kind,'보드를 연결하세요.');this.busy=true;const token=this.epoch;this.changed(label);try{return await fn(token);}catch(e){if(token===this.epoch)await this.fault(e);throw e;}finally{if(token===this.epoch){this.busy=false;this.changed();}}}
  async request(command,prefix,timeout=8000,token=this.epoch){
    check(token===this.epoch,'취소된 작업');check(!this.waiter,'명령 응답 동시 대기');
    const response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.waiter=null;reject(new Error('응답 시간 초과: '+command));},timeout);this.waiter={prefix,resolve,reject,timer};});
    try{await this.record({kind:'line',direction:'tx',source:this.transport.kind,line:command});check(token===this.epoch,'취소된 작업');await this.transport.send(command);}catch(e){this.rejectWaiter(e);}return response;
  }
  rejectWaiter(e){if(this.waiter){clearTimeout(this.waiter.timer);this.waiter.reject(e);this.waiter=null;}}
  async sequence(commands,token=this.epoch){for(const [cmd,prefix,ms] of commands)await this.request(cmd,prefix,ms||8000,token);}
  async handshake(){await this.operation('보드 설정 확인',async token=>{await this.sequence([['ADC_RATE,0','OK,ADC_RATE,'],['VER','V,'],['HW','HW,'],['ADCINFO','AI,'],['LIMITSTAT','L,'],['STAT','S,'],['MUXSTAT','M,'],['GPIO','G,']],token);this.readback=this.firmware===83&&this.adcInfo?.[0]===14&&Boolean(this.profile);if(this.readback)await this.request(`ADC_RATE,${this.monitorUs}`,'OK,ADC_RATE,',8000,token);this.changed(this.readback?'연결 확인 · 14bit ADC 숫자 자동 갱신':'읽기 전용 · v83 펌웨어가 필요합니다.');});}
  async line(line){
    await this.record({kind:'line',direction:'rx',source:this.transport.kind,line});const p=line.split(',');
    if(p[0]==='V'){check(p.length===2,'VER 형식');this.firmware=integer(p[1]);}
    else if(p[0]==='HW'){check(p.length===5&&integer(p[1])===this.firmware&&integer(p[4])===81,'HW version/divider mask');const ref=integer(p[2]),neutral=integer(p[3]);check(ref>=4500&&ref<=5500&&ref*neutral>=1150*4096&&ref*neutral<=1350*4096,'HW reference 범위');this.profile={firmware:this.firmware,vref_b_mV:ref,safe_code:neutral,adc_multipliers:[2,1,1,1,2,1,2,1],shunt_ohms:4,sense_gain:20};}
    else if(p[0]==='AI'){const a=p.slice(1).map(integer);check(a.length===4&&[12,14].includes(a[0])&&a[1]===(a[0]===14?16:4)&&a[2]===40&&a[3]===0,'ADCINFO 설정');this.adcInfo=a;}
    else if(['A14','A12'].includes(p[0])){const a=decodeAdc(line);check(a.bits===this.adcInfo?.[0],'ADC frame/config bit 불일치');this.raw=a.raw;this.adcAt=new Date().toISOString();}
    else if(p[0]==='S'){check(p.length===6,'STAT 형식');this.state=[integer(p[1]),integer(p[2]),integer(p[3]),integer(p[5])];}
    else if(p[0]==='M'){this.mux=p.slice(1).map(integer);check(this.mux.length===6,'MUXSTAT 형식');}
    else if(p[0]==='G'){check(p.length===3&&p.slice(1).every(x=>/^[0-9a-fA-F]+$/.test(x)),'GPIO 형식');this.gpio=p.slice(1).map(x=>parseInt(x,16));this.gpioAt=new Date().toISOString();}
    else if(p[0]==='L'){check(p.length>=3,'LIMITSTAT 형식');this.limitReadback=[integer(p[1]),integer(p[2])];}
    else if(p[0]==='C'){check(p.length===5,'CTRL 응답 형식');this.driveReadback=p.slice(1).map(integer);}
    else if(p[0]==='SP'&&this.capture){this.capture.preview.feed(line);this.capture.points=this.capture.preview.points;this.changed('진행 중 · CRC 검증 전');}
    else if(p[0]==='SC'&&this.capture){const c=this.capture;c.decoder.feed(line);if(c.decoder.complete){c.verification=c.preview.verify(c.decoder);c.points=electricalPoints(c.decoder);c.fit=fitSweep(c.points,c.request,c.fitLimit);c.crc_verified=true;this.changed('raw CRC / preview 합계 확인 · SAFE readback 대기');}}
    if(/^ERR(?:,|$)/.test(line))throw new Error(line+(/^\d+$/.test(p.at(-1))&&STATUS[Number(p.at(-1))]!==undefined?' · '+STATUS[Number(p.at(-1))]:''));
    this.changed();if(this.waiter&&line.startsWith(this.waiter.prefix)){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.resolve(line);}
  }
  async refresh(){await this.operation('GPIO / route 조회',token=>this.sequence([['STAT','S,'],['MUXSTAT','M,'],['GPIO','G,']],token));}
  async adc(){await this.operation('ADC 1회',token=>this.request('ADC','A14,',8000,token));}
  async monitor(us){check(us===0||(us>=50000&&us<=5000000),'ADC 갱신 50–5000 ms');await this.operation('ADC 갱신 설정',token=>this.request(`ADC_RATE,${us}`,'OK,ADC_RATE,',8000,token));this.monitorUs=us;}
  async applyLimits(plus,minus){this.guard();const [a,b]=limits(plus,minus);await this.operation('CC 설정 저장',token=>this.request(`LIMITS,${a},${b}`,'L,',8000,token));this.changed('CC 저장 · 다음 DUT 연결 / VCMD / sweep부터 적용');}
  dcCommands(dut,target,plus,minus,sign){return [['ADC_RATE,0','OK,ADC_RATE,'],[`LIMITS,${plus},${minus}`,'L,'],[`CTRL,${dut},${sign??Number(target>=0)},${Math.abs(target)}`,'C,',15000],['STAT','S,'],['MUXSTAT','M,'],['GPIO','G,'],[`ADC_RATE,${this.monitorUs}`,'OK,ADC_RATE,']];}
  async connectDut(dut,plus,minus){this.guard();dut=integer(dut);check(dut>=1&&dut<=30,'DUT 1–30');const [a,b]=limits(plus,minus);await this.operation('DUT 중립 연결',async token=>{await this.sequence([['STAT','S,'],['MUXSTAT','M,']],token);if(confirmedDut(this.state,this.mux)===dut){this.changed(`D${dut}: 이미 연결 · VCMD/CC 유지`);return;}const sign=confirmedDut(this.state,this.mux)!==null?this.state[3]:0;await this.sequence(this.dcCommands(dut,0,a,b,sign),token);check(confirmedDut(this.state,this.mux)===dut,'DUT/EN readback 불일치');this.changed(`D${dut}: 중립 연결 · 입력 VCMD 미인가`);});}
  async applyVcmd(value,absolute,plus,minus){this.guard();const target=targetMV(value,absolute,this.profile),[a,b]=limits(plus,minus),dut=confirmedDut(this.state,this.mux);check(dut!==null,'먼저 DUT 연결 버튼으로 연결하세요.');await this.operation('VCMD 적용',async token=>{await this.sequence([['STAT','S,'],['MUXSTAT','M,']],token);check(confirmedDut(this.state,this.mux)===dut,'연결 대상 변경됨');await this.sequence(this.dcCommands(dut,target,a,b),token);check(confirmedDut(this.state,this.mux)===dut,'DUT/EN 확인 실패');this.changed(`D${dut}: VCMD ${target} mV 적용`);});}
  async sweep(dut,endpoint,step,dwell,plus,minus,fitLimit){
    this.guard();const [a,b]=limits(plus,minus),r=sweepRequest(dut,endpoint,step,dwell,a,b);fitSweep([],r,fitLimit);check(!this.busy,'현재 작업 종료 후 실행');
    const id=newId(`D${r.dut}_${endpoint}mV`),c={id,kind:'sweep',request:r,seq:0,started_at_utc:new Date().toISOString(),gui_revision:REVISION,firmware:this.firmware,hardware_profile:{...this.profile},transport:this.transport.kind,fitLimit:Number(fitLimit),decoder:new SweepDecoder(r),preview:new SweepPreview(r),points:[],crc_verified:false,safe_readback_confirmed:false};this.capture=c;
    try{await this.journal.run(this.snapshot(c));await this.operation('sweep 준비',async token=>{await this.sequence([['ADC_RATE,0','OK,ADC_RATE,'],[`LIMITS,${a},${b}`,'L,'],[commandFor(r),'SC,E,',r.expected_points*(r.dwell_us+40000)/1000+60000],['STAT','S,'],['MUXSTAT','M,'],['GPIO','G,']],token);c.safe_readback_confirmed=safeReadback(this.state,this.mux,this.profile);check(c.crc_verified&&c.safe_readback_confirmed,'최종 CRC / SAFE readback 미확인');await this.request(`ADC_RATE,${this.monitorUs}`,'OK,ADC_RATE,',8000,token);c.outcome=c.decoder.meta.status===0?'complete':'guard_stop';this.changed(`D${r.dut}: ${c.decoder.meta.status_text} · ${c.points.length}점 · CRC / SAFE 확인`);});}
    catch(e){c.error=e.message;c.outcome='error';throw e;}
    finally{c.finished_at_utc=new Date().toISOString();this.lastCapture=this.snapshot(c);this.capture=null;await this.journal.run(this.lastCapture);this.changed();}
    return this.lastCapture;
  }
  snapshot(c){return {id:c.id,kind:c.kind,request:c.request,started_at_utc:c.started_at_utc,finished_at_utc:c.finished_at_utc,gui_revision:c.gui_revision,firmware:c.firmware,hardware_profile:c.hardware_profile,transport:c.transport,fit_limit_V:c.fitLimit,raw_capture:c.decoder.payload.slice(),metadata:{...c.decoder.meta},points:structuredClone(c.points),linear_fit:c.fit,preview_verification:c.verification,crc_verified:c.crc_verified,safe_readback_confirmed:c.safe_readback_confirmed,outcome:c.outcome||'running',error:c.error};}
  async safe(){check(this.transport.kind,'보드 연결 필요');this.epoch++;this.rejectWaiter(new Error('사용자 SAFE'));if(this.capture){this.capture.error='사용자 SAFE';this.capture.outcome='error';}this.busy=true;const token=this.epoch;
    try{await this.transport.send('SAFE');this.log('SAFE 우선 전송');await this.sequence([['STAT','S,'],['MUXSTAT','M,'],['GPIO','G,']],token);check(safeReadback(this.state,this.mux,this.profile),'SAFE readback 미확인');if(!this.loggingFailed)await this.request(`ADC_RATE,${this.monitorUs}`,'OK,ADC_RATE,',8000,token);this.changed('SAFE / S16 parking 확인');}finally{if(token===this.epoch){this.busy=false;this.changed();}}}
  async fault(e){if(this.expectedDisconnect){this.readback=false;this.rejectWaiter(e);this.changed('DFU 진입 후 애플리케이션 연결 종료 · bootloader 별도 선택');return;}this.log('중단: '+e.message);this.epoch++;this.rejectWaiter(e);this.readback=false;this.busy=false;if(this.capture){this.capture.error=e.message;this.capture.outcome='error';}if(this.transport.kind){try{await this.transport.send('SAFE');this.log('SAFE 요청 전송 · readback 미확인');}catch{this.log('연결 오류: SAFE 전달 여부 미확인');}}this.changed('중단: '+e.message);}
  async disconnect(){if(this.transport.kind)await this.safe();await this.transport.close();this.readback=false;this.changed('연결 해제');}
}
