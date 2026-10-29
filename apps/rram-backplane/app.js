import {REVISION,NAMES,GPIO,INIT_STATUS,check,adcValues,fitSweep,SweepDecoder,SweepPreview,ReferenceDecoder,electricalPoints,derivedPoints,confirmedDut,safeReadback,b64encode,b64decode,crc32,roundEven} from './protocol.js';
import {pointTableRows,pointRowsCsv,adcLogCsv} from './records.js';
import {Journal} from './storage.js';
import {Controller,newId} from './controller.js';
import {NUS} from './transport.js';
import {DFU_SERVICE,DfuLink,firmwarePackage,DEFAULT_HASH} from './dfu.js';
import {readZip,writeZip,download,sha256} from './archive.js';
import {plotSeries,fitText} from './plots.js';
import {SweepOverlay} from './overlay.js';
import {PulseDecoder} from './pulse.js';
import {pulseRequest,DacPulseDecoder,DAC_PULSE_PHASE} from './dacpulse.js';
import {csv as encodeCsv} from './records.js';
let pulseView=null;
const overlays=new SweepOverlay();let ingestedView=null,tableSignature=null;
const $=id=>document.getElementById(id),journal=new Journal();let controller,view=null,diagnosticView=null,renderScheduled=false,dfuTarget=null,dfuPayload=null,dfuBusy=false,dfuLink=null,initializing=false,historyBusy=false,plotSignature=null;
const logLines=[];
function log(message){logLines.push(new Date().toLocaleTimeString()+'  '+message);if(logLines.length>200)logLines.shift();$('event-log').textContent=logLines.join('\n');}
const value=id=>$(id).value;
function status(text){if(text){$('status').textContent=text;log(text);}}
function changed(text){if(text)status(text);if(!renderScheduled){renderScheduled=true;requestAnimationFrame(()=>{renderScheduled=false;render();});}}
function button(id,fn){$(id).addEventListener('click',async()=>{try{await fn();}catch(e){status(e.message||e.name);}});}
function busy(){return initializing||dfuBusy||controller?.busy;}
function monitorPeriod(){if(!$('monitor').checked)return 0;const ms=Number(value('period'));check(Number.isFinite(ms)&&ms>=50&&ms<=5000,'ADC 갱신 50–5000 ms');return roundEven(ms*1000);}
function render(){
  if(!controller)return;const c=controller,connected=Boolean(c.transport.kind),ready=c.ready()&&!busy(),dut=confirmedDut(c.state,c.mux);
  $('usb-connect').disabled=$('ble-connect').disabled=connected||busy();$('disconnect').disabled=!connected||dfuBusy||initializing;$('safe').disabled=!connected||dfuBusy;
  document.querySelectorAll('[data-drive]').forEach(b=>b.disabled=!ready);$('vcmd-apply').disabled=!ready||dut===null;
  document.querySelectorAll('[data-connected]').forEach(b=>b.disabled=!connected||busy());$('monitor').disabled=busy();
  $('connection').textContent=connected?`${c.transport.kind.toUpperCase()} 연결 · ${c.readback?'설정 확인':'readback 미확인'}`:'장비가 연결되지 않았습니다.';
  $('route').textContent=dut!==null?`실제 연결: D${dut} · bank ${dut<=15?'A':'B'}`:c.mux&&c.mux[5]===0?'실제 연결: S16 parking · DUT 연결 해제':'실제 연결: 미확인';
  $('board').textContent=c.profile?`VER${c.firmware} · 실효 VrefB 추정 ${(c.profile.vref_b_mV/1000).toFixed(3)} V · SAFE code ${c.profile.safe_code}`:'보드 설정 미확인';
  const ri=c.referenceReport,final=ri?.final;
  $('reference-init').disabled=!connected||busy()||![85,86,87].includes(c.firmware)||!safeReadback(c.state,c.mux,c.profile);
  $('reference-export').disabled=!c.lastReference||busy();
  $('reference-status').textContent=ri?`${ri.ready&&c.referenceMatches()?'초기화 확인':'구동 차단'} · ${ri.status_text} · epoch ${ri.epoch} · ${ri.frame_count} frames · CRC ${ri.crc32}`:c.firmware===85?`초기화 기록 미확인 · ${INIT_STATUS[c.initStatus?.[0]??0]}`:c.firmware?`VER${c.firmware} 읽기 전용 · 전원 기준 초기화에는 v85 필요`:'보드 연결 후 확인';
  $('reference-values').textContent=final?`V_CMD ${final.vcmd_V.toFixed(4)} V · V_MID ${final.vmid_V.toFixed(4)} V · 차이 ${final.difference_mV.toFixed(2)} mV · 실효 기준 ${ri.vref_b_mV} mV · SAFE code ${ri.safe_code}`:'초기화에 DUT 전압이나 V_FB를 사용하지 않습니다. AIN6·AIN7만 기준으로 사용합니다.';
  if(c.limitReadback)$('cc-readback').textContent=`보드 CC+ ${(c.limitReadback[0]/1000).toFixed(3)} / CC− ${(c.limitReadback[1]/1000).toFixed(3)} mA · 명목값`+(c.driveReadback&&dut!==null?` · 최근 CTRL ${(c.driveReadback[2]/1000).toFixed(3)} mA ${c.driveReadback[3]?'PU':'PD'}`:'');
  if(c.raw){const bits=c.adcInfo[0],a=adcValues(c.raw,bits);NAMES.forEach((_,i)=>{const [main,sub]=i===5?[`${a.current_mA.toFixed(3)} mA`,`V_IS ${a.volts[5].toFixed(4)} V`]:i===2||i===3?[`${(i===2?a.cc_plus_mA:a.cc_minus_mA).toFixed(3)} mA`,`기준 ${a.volts[i].toFixed(4)} V`]:[`${a.volts[i].toFixed(4)} V`,`raw ${c.raw[i]}`];$('adc-'+i).textContent=main;$('sub-'+i).textContent=sub+(c.raw[i]<0||c.raw[i]>=4091*2**(bits-12)?' · 포화':'');});$('derived').textContent=`V_FB−V_MID ${a.feedback_V.toFixed(4)} V · TE_I−BE_I (FORCE) ${a.force_V.toFixed(4)} V · I ${a.current_mA.toFixed(3)} mA (4.0 Ω / gain20)`;$('adc-updated').textContent=`ADC ${bits}bit · 평균 ${c.adcInfo[1]}회 · ${new Date(c.adcAt).toLocaleTimeString()}${connected?'':' · 연결 해제 전 마지막 값'}`;}
  if(c.gpio){GPIO.forEach((_,i)=>{for(let j=0;j<2;j++){const e=$(`pin-${i}-${j}`),high=Boolean(c.gpio[j]&(1<<i));e.textContent=high?'HIGH':'LOW';e.className=high?'high':'low';}});$('gpio-info').textContent=`${new Date(c.gpioAt).toLocaleTimeString()} · ADG884 ${c.gpio[0]&(1<<9)?'PU':'PD'} · ${$('route').textContent}`;}
  if(c.capture){const x=c.capture;view={id:x.id,request:x.request,points:x.points,point_rows:x.point_rows,linear_fit:x.fit||fitSweep(x.points,x.request,x.fitLimit),crc_verified:x.crc_verified,safe_readback_confirmed:x.safe_readback_confirmed,outcome:'running',metadata:x.decoder.meta};}
  else if(c.lastCapture&&(!view||view.outcome==='running'))view=c.lastCapture;
  const points=view?.points||[],r=view?.request,fit=view?.linear_fit;
  const signature=[view?.id,points.length,view?.crc_verified,fit?.max_abs_V,view?.outcome].join(':');
  if(signature!==ingestedView){if(view)overlays.add(view);ingestedView=signature;}
  if(signature!==tableSignature){renderPointTable(view);tableSignature=signature;}
  if(overlays.revision!==plotSignature){for(const kind of ['command','potential','sense'])plotSeries($('plot-'+kind),overlays.visible(),kind);plotSignature=overlays.revision;}
  const held=overlays.visible();$('overlay-info').textContent=held.length?`D${overlays.dut} · 중첩 ${held.map(x=>(x.request.endpoint_mV/1000)+' V'+(x.crc_verified?'':' (CRC 전)')).join(' / ')} · 표와 근사는 최근 선택 기록 기준`:'표시된 sweep 없음 · 저장 원본은 유지됩니다.';
  $('plot-clear').disabled=busy();
  $('pulse-run').disabled=!ready||c.firmware!==87;$('pulse-export').disabled=!pulseView||busy();
  $('pulse-result').textContent=c.pulseCapture?'Pulse 처리 중 · DAC/LDAC timer·DMA/SAFE 확인 대기':pulseView?`D${pulseView.request.dut} · ${pulseView.request.target_mV} mV · 예약 폭 ${pulseView.request.width_us} µs · ${pulseView.metadata.status_text||pulseView.error||pulseView.outcome}\n${pulseView.metadata.firmware===87?'DAC/LDAC timer · neutral DMA '+(pulseView.metadata.neutral_dma_verified?'확인':'미확인'):'과거 v86 MUX-gated pulse 기록'}\nCRC ${pulseView.crc_verified?'확인':'미확인'} · SAFE readback ${pulseView.safe_readback_confirmed?'확인':'미확인'} · pulse 내부 ADC ${pulseView.metadata.in_pulse_frames??0} scan\n${pulseView.metadata.in_pulse_frames?'이 scan도 순차 ADC이며 아날로그 edge/폭 교정이 아닙니다.':'pulse 내부 ADC 표본 없음: 전류/저항/피크를 측정했다고 해석하지 마세요.'}`:c.firmware!==87?'DAC pulse에는 v87 펌웨어 업로드 필요 (v86 MUX pulse 차단)':'단일 DAC pulse 대기 · 100–1000000 µs · 아날로그 파형 미검증';
  $('fit-result').textContent=fitText(fit)+(view&&!view.crc_verified?'\n실시간 미리보기 · CRC 검증 전':'' );
  $('progress').max=r?.expected_points||1;$('progress').value=points.length;$('progress-text').textContent=r?`D${r.dut} · ${points.length}/${r.expected_points}점 · ${view.outcome==='running'?'진행 중':view.outcome} · CRC ${view.crc_verified?'확인':'미확인'} · SAFE ${view.safe_readback_confirmed?'확인':'미확인'}`:'측정 기록 없음';
  $('export-current').disabled=!view||busy();$('export-points').disabled=!view?.crc_verified||busy();$('adc-export').disabled=!c.session||busy();$('direction-export').disabled=!diagnosticView||busy();$('refit').disabled=busy();$('history-files').disabled=busy();$('latest-record').disabled=busy();
  $('direction-result').textContent=diagnosticView?`${diagnosticView.started_at_utc} · ${diagnosticView.outcome} · 읽기 전용 / ADC 새 획득 없음\n${diagnosticView.error||''}\n${diagnosticView.lines.join('\n')}`:'방향 진단 기록 없음';
  for(const id of ['dfu-default','dfu-file','dfu-usb-pick','dfu-ble-pick'])$(id).disabled=busy();$('dfu-upload').disabled=!dfuTarget||!dfuPayload||busy()||connected;$('dfu-cancel').disabled=!dfuBusy;
}
function renderPointTable(run){
  const scroller=$('point-table-scroll'),top=scroller.scrollTop,rows=pointTableRows(run),body=$('point-rows');body.replaceChildren();
  const number=(x,d)=>Number.isFinite(x)?x.toFixed(d):'—';
  for(const p of rows){const tr=document.createElement('tr');tr.className=p.compliance?'cc-point':p.below_current_floor?'floor-point':'';
    const branch=p.index===run.request.n?'전환점':p.index<run.request.n?'진행':'복귀';
    for(const text of [p.index+1,branch,p.target_mV,number(p.voltage_V,5),number(p.force_V,5),number(p.current_mA,4),p.provisional?'CRC 대기':number(p.resistance_ohms,0),p.provisional?'—':number(p.current_sd_mA,5),p.compliance?'CC':p.provisional?'잠정':p.below_current_floor?'검출 하한':'CV']){const td=document.createElement('td');td.textContent=String(text);tr.append(td);}body.append(tr);
  }
  scroller.scrollTop=top;$('point-info').textContent=run?`D${run.request.dut} · ${rows.length}점 · ${run.crc_verified?'원시 CRC 확인 · guard 제외 / settled scan 평균':'실시간 미리보기 · CRC 전에는 점별 R·표준편차를 확정하지 않음'}`:'측정 기록 없음';
}
function withPointRows(run,{redisplay=true}={}){
  if(redisplay)ingestedView=null;
  if(!run.crc_verified||run.point_rows)return run;
  check(run.raw_capture&&parseInt(run.metadata.crc32,16)===crc32(run.raw_capture),'저장 기록 raw CRC 불일치');
  const d=new SweepDecoder(run.request);d.payload=run.raw_capture;d.firmware=run.metadata.firmware;d.decode();d.complete=true;
  return {...run,point_rows:derivedPoints(d)};
}
function setTab(id){document.querySelectorAll('[role=tab]').forEach(b=>{const active=b.getAttribute('aria-controls')===id;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$(b.getAttribute('aria-controls')).hidden=!active;});changed();}
document.querySelectorAll('[role=tab]').forEach(b=>{b.addEventListener('click',()=>setTab(b.getAttribute('aria-controls')));b.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const tabs=[...document.querySelectorAll('[role=tab]')],i=tabs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].focus();setTab(tabs[next].getAttribute('aria-controls'));}});});
NAMES.forEach((name,i)=>{const card=document.createElement('div');card.className='adc-card';const title=document.createElement('div');title.className='adc-name';title.textContent=`AIN${i} · ${name}`;const main=document.createElement('div');main.className='adc-value';main.id='adc-'+i;main.textContent='—';const sub=document.createElement('div');sub.className='adc-sub';sub.id='sub-'+i;sub.textContent=[2,3,5].includes(i)?'mA · 전압 기반 추정':'V';card.append(title,main,sub);$('adc-cards').append(card);});
for(let i=1;i<=30;i++){const o=document.createElement('option');o.value=i;o.textContent=i;$('dut').append(o);}
GPIO.forEach(([signal,pin],i)=>{const row=document.createElement('tr');for(const text of [signal,pin]){const e=document.createElement('td');e.textContent=text;row.append(e);}for(let j=0;j<2;j++){const e=document.createElement('td');e.id=`pin-${i}-${j}`;e.textContent='—';row.append(e);}$('gpio-rows').append(row);});
async function connect(kind){check(!controller.transport.kind&&!busy(),'기존 연결 / 작업을 종료하세요.');check(window.isSecureContext,'HTTPS secure context 필요');check(kind==='usb'?'serial' in navigator:'bluetooth' in navigator,`${kind} API를 지원하지 않는 브라우저입니다.`);controller.monitorUs=monitorPeriod();
  // Chooser is invoked directly in the click handler, before any awaited work.
  let selected;try{selected=kind==='usb'?await navigator.serial.requestPort():await navigator.bluetooth.requestDevice({filters:[{services:[NUS]}]});}catch(e){if(e.name==='NotFoundError')throw new Error('장비 선택이 취소됐습니다. USB/BLE 연결을 직접 누른 뒤 정확한 보드를 선택하세요. 아직 보드 명령은 전송하지 않았습니다.');throw e;}
  initializing=true;render();try{if(kind==='usb')await controller.connectUsb(selected);else await controller.connectBle(selected);}catch(e){await controller.transport.close();throw e;}finally{if(controller.lastReference)try{await persistFiles(controller.lastReference);}catch(e){status('초기화 기록 폴더 저장 실패 · IndexedDB 보존: '+e.message);}initializing=false;await history();changed();}}
button('usb-connect',()=>connect('usb'));button('ble-connect',()=>connect('ble'));button('disconnect',()=>controller.disconnect());button('safe',()=>controller.safe());
button('dut-connect',()=>controller.connectDut(value('dut'),value('cc-plus'),value('cc-minus')));
button('vcmd-apply',()=>controller.applyVcmd(value('vcmd'),value('reference')==='absolute',value('cc-plus'),value('cc-minus')));
button('cc-apply',()=>controller.applyLimits(value('cc-plus'),value('cc-minus')));button('adc-once',()=>controller.adc());button('gpio-refresh',()=>controller.refresh());
button('monitor-apply',()=>controller.monitor(monitorPeriod()));
$('monitor').addEventListener('change',async()=>{if(!controller?.transport.kind)return;try{await controller.monitor(monitorPeriod());}catch(e){status(e.message);}});
button('adc-export',async()=>{const id=controller.session;check(id,'수신 세션이 없습니다.');const data=adcLogCsv(await journal.wire(id));check(data.frames>0,'이 세션에 수신된 ADC frame이 없습니다.');download(id+'_adc.csv',new TextEncoder().encode(data.text));status(`수신 ADC ${data.frames} frame CSV 저장 · 원시 코드와 환산값 별도 열`);});
button('direction-read',async()=>{const previous=controller.lastDiagnostic?.id;try{await controller.readDirection();}finally{if(controller.lastDiagnostic?.id!==previous){diagnosticView=controller.lastDiagnostic;if(diagnosticView)await persistFiles(diagnosticView);}await history();changed();}});
button('direction-export',()=>exportRun(diagnosticView));
button('reference-init',async()=>{const previous=controller.lastReference?.id;try{await controller.reinitializeReference();}finally{if(controller.lastReference?.id!==previous&&controller.lastReference)await persistFiles(controller.lastReference);await history();changed();}});
button('reference-export',()=>exportRun(controller.lastReference));
document.querySelectorAll('[data-endpoint]').forEach(b=>b.addEventListener('click',async()=>{const previous=controller.lastCapture?.id;try{const end=Number(b.dataset.endpoint);check(!busy(),'작업 중');if(!confirm(`D${value('dut')}: ${end>0?'+':''}${end/1000} V 왕복 sweep\nCC+ ${value('cc-plus')} mA / CC− ${value('cc-minus')} mA\n${value('step')} mV step, ${value('dwell')} ms dwell\n기존 연결은 S16을 거쳐 전환됩니다. 실행할까요?`))return;view=null;await controller.sweep(value('dut'),end,value('step'),value('dwell'),value('cc-plus'),value('cc-minus'),value('fit-limit'));}
  catch(e){status(e.message);}finally{if(controller.lastCapture&&controller.lastCapture.id!==previous){view=controller.lastCapture;try{await persistFiles(view);}catch(e){status('측정 기록 폴더 저장 실패 · IndexedDB 원시 보존: '+e.message);}}await history();changed();}}));
async function filesFor(run){const wire=await journal.wire(run.id),raw=run.raw_capture||new Uint8Array(),metadata={schema:run.kind==='reference_init'?'rram-web-reference-v1':'rram-web-sweep-v1',kind:run.kind,request:run.request,source_command:run.source_command,gui_revision:run.gui_revision,started_at_utc:run.started_at_utc,hardware_profile:run.hardware_profile,transport:run.transport,raw_unchanged:true};const {raw_capture,...result}=run;
  if(run.kind==='pulse'){const frames=run.frames||[],rows=[['start_us','end_us','phase','phase_text','guard_status',...NAMES.map((_,i)=>'AIN'+i+'_raw')],...frames.map(f=>[f.start_us,f.end_us,f.phase,f.phase_text||(run.metadata?.firmware===87?DAC_PULSE_PHASE[f.phase]:['S16 neutral precheck','S16 biased precheck','guard bracket inside pulse','guard bracket overlapping park','S16 neutral postcheck'][f.phase]),f.guard_status,...f.raw_codes])];return hashFiles(run.id,{'metadata.json':{...metadata,schema:'rram-web-pulse-v1'},'raw_wire.jsonl':wire.map(x=>JSON.stringify(x)).join('\n')+'\n','raw_capture.bin':raw,'raw_pulse_frames.csv':encodeCsv(rows),'result.json':result});}
  if(run.kind==='diagnostic')return hashFiles(run.id,{'metadata.json':{...metadata,schema:'rram-web-direction-readonly-v1',read_only:true},'raw_wire.jsonl':wire.map(x=>JSON.stringify(x)).join('\n')+'\n','direction_lines.txt':run.lines.join('\n')+'\n','result.json':result});
  if(run.kind==='reference_init'){const csv=['start_us,end_us,code,phase,pupd,AIN0,AIN1,AIN2,AIN3,AIN4,AIN5,AIN6,AIN7'];if(run.crc_verified){const d=new ReferenceDecoder();d.payload=raw;d.decode();for(const f of d.frames)csv.push([f.start_us,f.end_us,f.code,f.phase,f.pupd,...f.raw_codes].join(','));}return hashFiles(run.id,{'metadata.json':metadata,'raw_wire.jsonl':wire.map(x=>JSON.stringify(x)).join('\n')+'\n','raw_capture.bin':raw,'raw_reference_frames.csv':csv.join('\n')+'\n','result.json':result});}
  const csv=['point,target_mV,phase,start_us,end_us,AIN0,AIN1,AIN2,AIN3,AIN4,AIN5,AIN6,AIN7'];let rows=[];if(run.crc_verified){check(parseInt(run.metadata.crc32,16)===crc32(raw),'내보내기 raw CRC 불일치');const d=new SweepDecoder(run.request);d.payload=raw;d.firmware=run.metadata.firmware;d.decode();d.complete=true;rows=derivedPoints(d);for(const p of d.points)for(const f of p.frames)csv.push([p.index,p.target_mV,f.phase,f.start_us,f.end_us,...f.raw_codes].join(','));}
  const files={'metadata.json':metadata,'raw_wire.jsonl':wire.map(x=>JSON.stringify(x)).join('\n')+'\n','raw_capture.bin':raw,'raw_point_frames.csv':csv.join('\n')+'\n','derived_points.csv':pointRowsCsv(rows),'electrical_points.json':{crc32:run.metadata.crc32,points:run.points},'linear_fit.json':run.linear_fit||{},'result.json':result};
  return hashFiles(run.id,files);
}
async function hashFiles(id,files){const hashes={};for(const [name,data] of Object.entries(files)){const b=data instanceof Uint8Array?data:new TextEncoder().encode(typeof data==='string'?data:JSON.stringify(data,null,2));hashes[name]=await sha256(b);}files['manifest.json']={schema:'rram-web-export-v1',run_id:id,sha256:hashes};return files;}
async function persistFiles(run){if(journal.folder)await journal.saveFiles(run.id,await filesFor(run));}
async function exportRun(run){download(run.id+'.zip',writeZip(await filesFor(run)));status('raw / 분석 / SHA256 manifest ZIP 저장');}
button('export-current',()=>exportRun(view));
document.querySelectorAll('[data-pulse-preset]').forEach(b=>b.addEventListener('click',()=>{$('pulse-voltage').value=b.dataset.pulsePreset;status('Pulse 전압 입력만 변경 · 구동 명령 없음');}));
button('pulse-run',async()=>{const r=pulseRequest(value('dut'),value('pulse-voltage'),value('pulse-width'));check(controller.firmware===87,'DAC pulse용 v87 펌웨어가 필요합니다.');if(!confirm(`D${r.dut} · ${r.target_mV} mV · ${r.width_us} µs 단일 pulse\nCC+ ${value('cc-plus')} / CC− ${value('cc-minus')} mA\nS16에서 ±20 mV 방향 준비 후 DUT를 영점 부근에 연결합니다. DAC/LDAC가 목표 전압으로 변하고 지정 시간 후 복귀합니다.\n실제 아날로그 pulse 폭과 피크전류는 미교정입니다. 실행할까요?`))return;const previous=controller.lastPulse?.id;try{await controller.pulse(r.dut,r.target_mV,r.width_us,value('cc-plus'),value('cc-minus'));}finally{if(controller.lastPulse?.id!==previous){pulseView=controller.lastPulse;if(pulseView)await persistFiles(pulseView);}await history();changed();}});
button('pulse-export',()=>exportRun(pulseView));
button('plot-clear',()=>{check(!busy(),'측정 종료 후 plot을 초기화하세요.');overlays.clear();changed('plot 표시만 초기화 · 저장 원본 / DUT / DAC 변경 없음');});
button('export-points',()=>{check(view?.crc_verified&&!busy(),'CRC 확인된 측정 종료 후 저장하세요.');view=withPointRows(view,{redisplay:false});download(view.id+'_derived_points.csv',new TextEncoder().encode(pointRowsCsv(view.point_rows)));status('점별 파생 CSV 저장 · 원시 데이터 변경 없음');});
button('refit',async()=>{check(view&&view.request,'측정 기록이 없습니다.');check(!busy(),'측정 종료 후 근사 갱신');const f=fitSweep(view.points,view.request,value('fit-limit'));view={...view,linear_fit:f};changed('화면 근사 갱신 · DAC / GPIO 변경 없음');const analysis={id:newId('linear_fit_reanalysis'),kind:'analysis',source_run:view.id,started_at_utc:new Date().toISOString(),linear_fit:f};await journal.run(analysis);if(journal.folder)await journal.saveFiles(view.id,{[analysis.id+'.json']:analysis});});
async function history(){
  if(historyBusy)return;historyBusy=true;
  try{const all=(await journal.list()).filter(x=>['sweep','reference_init','diagnostic','pulse'].includes(x.kind)).sort((a,b)=>b.started_at_utc.localeCompare(a.started_at_utc));$('history-rows').replaceChildren();
    for(const run of all){const init=run.kind==='reference_init',diag=run.kind==='diagnostic',pulse=run.kind==='pulse',tr=document.createElement('tr');
      const range=init?'전원 초기화':diag?'방향 진단':pulse?`Pulse ${run.request.target_mV} mV / ${run.request.width_us} µs`:`${run.request.endpoint_mV/1000} V`;
      const count=diag?run.lines.length:init||pulse?run.metadata?.frame_count||0:run.points?.length||0;
      const state=diag?`${run.error||run.outcome} / 읽기 전용 / 안전 판정 아님`:`${run.error||run.metadata?.status_text||run.outcome} / CRC ${run.crc_verified?'확인':'미확인'} / ${init?'초기화 '+(run.metadata?.ready?'완료':'미확인'):'SAFE '+(run.safe_readback_confirmed?'확인':'미확인')}`;
      for(const text of [run.id,init?'S16':diag?'조회':'D'+run.request.dut,range,count,state]){const td=document.createElement('td');td.textContent=String(text);tr.append(td);}
      const td=document.createElement('td'),show=()=>{check(!busy(),'현재 측정 종료 후 보기');if(diag){diagnosticView=run;setTab('gpio');}else if(pulse){pulseView=run;setTab('control');}else{view=withPointRows(run);setTab('control');}};
      for(const [label,fn] of [...(init?[]:[['보기',show]]),['ZIP',()=>exportRun(run)]]){const b=document.createElement('button');b.textContent=label;b.addEventListener('click',()=>Promise.resolve().then(fn).catch(e=>status(e.message)));td.append(b);}tr.append(td);$('history-rows').append(tr);
    }
    const sweeps=all.filter(x=>x.kind==='sweep');if(!view&&sweeps.length&&!controller.capture){view=withPointRows(sweeps[0]);changed();}
  }finally{historyBusy=false;}
}
button('latest-record',async()=>{check(!busy(),'현재 측정 종료 후 보기');const records=(await journal.list()).filter(x=>x.kind==='sweep').sort((a,b)=>b.started_at_utc.localeCompare(a.started_at_utc));check(records.length,'저장된 sweep이 없습니다.');view=withPointRows(records[0]);changed('최근 저장 sweep 표시 · 장비 명령 없음');});
button('history-refresh',history);button('choose-folder',async()=>{await journal.directory();$('storage-info').textContent='IndexedDB raw 자동 저장 · 측정 종료 시 선택한 폴더에도 저장';});
async function importFiles(files){check(!busy(),'현재 작업 종료 후 가져오기');let entries=new Map();if(files.length===1&&files[0].name.endsWith('.zip'))entries=await readZip(new Uint8Array(await files[0].arrayBuffer()));else for(const f of files)entries.set(f.name,new Uint8Array(await f.arrayBuffer()));
  const get=name=>{const matches=[...entries.keys()].filter(k=>k===name||k.endsWith('/'+name));check(matches.length===1,`${name} 파일 하나가 필요합니다.`);return entries.get(matches[0]);},json=name=>JSON.parse(new TextDecoder().decode(get(name)));
  const metadata=json('metadata.json'),result=json('result.json'),raw=get('raw_capture.bin'),r=metadata.request||result.request,isPulse=metadata.kind==='pulse'||result.kind==='pulse';check(r&&raw.length>=(isPulse?64:304),'요청 metadata / raw capture 누락');const expected=result.metadata?.crc32;check(expected&&parseInt(expected,16)===crc32(raw),'가져온 raw / 저장된 CRC 불일치');
  const d=isPulse?(result.metadata?.firmware===87?new DacPulseDecoder(r):new PulseDecoder(r)):new SweepDecoder(r);d.payload=raw;d.firmware=result.metadata.firmware;if(!isPulse)check([81,82,83,84,85].includes(d.firmware),'SC81–85 native 기록만 지원');d.decode();d.complete=true;
  const points=isPulse?undefined:electricalPoints(d),fit=isPulse?undefined:fitSweep(points,r,value('fit-limit')),run={id:newId(`import_D${r.dut}`),kind:isPulse?'pulse':'sweep',request:r,started_at_utc:metadata.started_at_utc||new Date().toISOString(),gui_revision:REVISION,raw_capture:raw,metadata:d.meta,points,frames:isPulse?d.frames:undefined,point_rows:isPulse?undefined:derivedPoints(d),linear_fit:fit,crc_verified:true,safe_readback_confirmed:result.safe_readback_confirmed===true,outcome:d.meta.status===0?'complete':'guard_stop',imported:true,import_integrity:'raw file vs stored CRC; no new physical measurement'};
  const wireNames=[...entries.keys()].filter(k=>/(raw_wire|raw_sc_wire|raw_preview_wire)\.jsonl$/.test(k));let seq=0;for(const name of wireNames){const text=new TextDecoder().decode(entries.get(name));for(const s of text.split(/\r?\n/).filter(Boolean)){const rec=JSON.parse(s);await journal.append({...rec,run_id:run.id,seq:seq++,source_file:name});}}
  await journal.run(run);if(isPulse)pulseView=run;else view=run;await history();setTab('control');status('저장 기록 불러옴 · 새 실측 아님');}
$('history-files').addEventListener('change',async e=>{try{await importFiles([...e.target.files]);}catch(err){status(err.message);}finally{e.target.value='';}});
async function loadPackage(bytes,name,isDefault=false){check(!busy(),'작업 중');const p=await firmwarePackage(bytes);if(isDefault)check(p.sha256===DEFAULT_HASH,'기본 firmware SHA256 불일치');dfuPayload=p;$('dfu-package').textContent=`${name} · app ${p.application.length} bytes · SHA256 ${p.sha256}`;render();}
$('dfu-file').addEventListener('change',async e=>{try{if(e.target.files[0])await loadPackage(new Uint8Array(await e.target.files[0].arrayBuffer()),e.target.files[0].name);}catch(err){dfuPayload=null;status(err.message);render();}});
button('dfu-default',async()=>{const response=await fetch('firmware/rram_backplane_app_v87_dacpulse_rramkey_signed.zip');check(response.ok,'기본 ZIP 파일 없음');await loadPackage(new Uint8Array(await response.arrayBuffer()),'v87 DAC Pulse RRAM-key signed candidate · 업로드/실기 검증 전',true);});
button('dfu-enter',async()=>{check(controller.transport.kind&&[83,84,85,86,87].includes(controller.firmware)&&controller.profile&&!controller.loggingFailed&&!busy(),'VER/HW 확인 및 작업 종료 필요');if(!confirm('SAFE readback 확인 후 DFU 진입합니다. 현재 연결은 종료됩니다. 계속할까요?'))return;await controller.safe();initializing=true;controller.expectedDisconnect=true;render();try{await controller.record({kind:'line',direction:'tx',source:controller.transport.kind,line:'DFU'});await controller.transport.send('DFU');await new Promise(r=>setTimeout(r,300));await controller.transport.close();controller.readback=false;status('DFU 진입 요청됨 · bootloader는 별도로 선택하세요.');}finally{initializing=false;controller.expectedDisconnect=false;render();}});
button('dfu-usb-pick',async()=>{check(!busy()&&!controller.transport.kind,'애플리케이션 연결을 종료하세요.');check('serial' in navigator,'Web Serial 미지원');const selected=await navigator.serial.requestPort({filters:[{usbVendorId:0x1915,usbProductId:0x521f}]});dfuTarget={kind:'usb',selected};$('dfu-target').textContent='선택됨: USB Secure DFU 1915:521f';render();});
button('dfu-ble-pick',async()=>{check(!busy()&&!controller.transport.kind,'애플리케이션 연결을 종료하세요.');check('bluetooth' in navigator,'Web Bluetooth 미지원');const selected=await navigator.bluetooth.requestDevice({filters:[{name:'DfuTarg',services:[DFU_SERVICE]}]});dfuTarget={kind:'ble',selected};$('dfu-target').textContent='선택됨: BLE '+selected.name;render();});
button('dfu-upload',async()=>{check(dfuPayload&&dfuTarget&&!busy()&&!controller.transport.kind,'ZIP과 bootloader 대상 선택 필요');if(!confirm(`${dfuTarget.kind.toUpperCase()} 대상에 선택한 서명 firmware를 전송합니다.\nSHA256 ${dfuPayload.sha256}\n웹 전송은 실물 검증 전입니다. 계속할까요?`))return;
  dfuBusy=true;render();const id=newId('dfu'),start=new Date().toISOString();let seq=0;
  try{await journal.run({id,kind:'dfu',started_at_utc:start,sha256:dfuPayload.sha256,outcome:'running'});dfuLink=new DfuLink(dfuTarget.kind,dfuTarget.selected,(direction,b)=>journal.append({run_id:id,seq:seq++,at_utc:new Date().toISOString(),direction,base64:b64encode(b)}));await dfuLink.open();await dfuLink.transfer(dfuPayload,(count,total,phase)=>{$('dfu-progress').max=total;$('dfu-progress').value=count;$('dfu-status').textContent=`${phase} · ${(100*count/total).toFixed(1)}%`;});$('dfu-status').textContent='DFU 전송 완료 · CRC/EXECUTE 확인 · 재연결 후 VER/HW 검증 필요';await journal.run({id,kind:'dfu',started_at_utc:start,finished_at_utc:new Date().toISOString(),sha256:dfuPayload.sha256,outcome:'transfer_complete'});}
  catch(e){$('dfu-status').textContent='DFU 실패: '+e.message+' · 자동 재시도 없음';await journal.run({id,kind:'dfu',started_at_utc:start,finished_at_utc:new Date().toISOString(),sha256:dfuPayload.sha256,outcome:'error',error:e.message});throw e;}
  finally{try{await dfuLink?.close();}finally{dfuLink=null;dfuBusy=false;dfuTarget=null;$('dfu-target').textContent='DFU 대상 재선택 필요';render();}}});
button('dfu-cancel',()=>{dfuLink?.cancel();status('DFU 취소 요청 · bootloader 상태에서 다시 연결해야 할 수 있습니다.');});
window.addEventListener('beforeunload',e=>{if(controller?.transport.kind||dfuBusy){e.preventDefault();e.returnValue='';}});
window.addEventListener('error',e=>{status('웹 callback 오류: '+e.message);if(controller?.transport.kind)controller.fault(e.error||new Error(e.message));});
async function boot(){try{await journal.open();if(navigator.storage?.persist)await navigator.storage.persist();$('storage-info').textContent='IndexedDB raw 자동 저장 활성 · 폴더 / ZIP은 별도 백업';controller=new Controller(journal,changed,log);const compatible=window.isSecureContext&&'serial' in navigator&&'bluetooth' in navigator;$('capabilities').textContent=compatible?'v87 DAC Pulse / 중첩 sweep · v85/86는 기존 제어·sweep만 가능. ADC14 / HW / 초기화 CRC 확인 후 구동합니다. Python GUI에서 포트를 먼저 해제하세요.':'HTTPS 및 Web Serial / Web Bluetooth 지원 브라우저가 필요합니다. 연결 버튼에서 지원 여부를 확인합니다.';$('capabilities').classList.toggle('error',!compatible);status('준비 · v87 DAC pulse는 업로드/실기 검증 전 · 구동 자동 실행 없음');await history();render();}catch(e){$('capabilities').textContent='자동 저장 초기화 실패 · 구동 차단: '+e.message;$('capabilities').classList.add('error');status(e.message);}}
boot();
