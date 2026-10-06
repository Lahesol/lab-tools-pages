// Nordic Secure DFU object protocol. Signing/verification stays in bootloader.
import {check,crc32} from './protocol.js';
import {SerialChannel} from './transport.js';
import {readZip,sha256} from './archive.js';
export const DFU_SERVICE='0000fe59-0000-1000-8000-00805f9b34fb';
const CP='8ec90001-f315-4f60-9fb8-838830daea50',PKT='8ec90002-f315-4f60-9fb8-838830daea50';
export const DEFAULT_HASH='c216c40bdd087836a1f03957879c53d91061a6e7e6d0c602dc7332da6dd4e3fa';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const u32=n=>Uint8Array.of(n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255);
const values=(b,count)=>{check(b.length===4*count,'DFU response 길이');const d=new DataView(b.buffer,b.byteOffset,b.byteLength);return Array.from({length:count},(_,i)=>d.getUint32(i*4,true));};
export function slipEncode(b){const a=[];for(const x of b){if(x===0xc0)a.push(0xdb,0xdc);else if(x===0xdb)a.push(0xdb,0xdd);else a.push(x);}a.push(0xc0);return Uint8Array.from(a);}
export class SlipDecoder {
  buffer=[];escape=false;
  feed(bytes){const packets=[];for(const x of bytes){if(x===0xc0){check(!this.escape,'SLIP escape 누락');if(this.buffer.length)packets.push(Uint8Array.from(this.buffer));this.buffer=[];}else if(this.escape){check([0xdc,0xdd].includes(x),'SLIP escape');this.buffer.push(x===0xdc?0xc0:0xdb);this.escape=false;}else if(x===0xdb)this.escape=true;else this.buffer.push(x);check(this.buffer.length<=4096,'SLIP packet 크기');}return packets;}
}
class Responses {
  constructor(){this.items=[];this.waiter=null;}
  push(b){if(this.waiter){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.resolve(b);}else this.items.push(b);}
  fail(e){if(this.waiter){clearTimeout(this.waiter.timer);this.waiter.reject(e);this.waiter=null;}}
  take(){if(this.items.length)return Promise.resolve(this.items.shift());return new Promise((resolve,reject)=>{check(!this.waiter,'DFU response 동시 대기');const timer=setTimeout(()=>{this.waiter=null;reject(new Error('DFU 응답 시간 초과'));},15000);this.waiter={resolve,reject,timer};});}
}
export async function firmwarePackage(bytes){const files=await readZip(bytes);check(files.has('manifest.json'),'DFU manifest 없음');const m=JSON.parse(new TextDecoder().decode(files.get('manifest.json'))).manifest;check(m&&Object.keys(m).length===1&&m.application,'application-only signed ZIP 필요');const command=files.get(m.application.dat_file),application=files.get(m.application.bin_file);check(command?.length>0&&command.length<=8192&&application?.length>0&&application.length<1024*1024,'DFU 파일 누락/크기');return {command,application,sha256:await sha256(bytes),names:m.application};}
export class DfuLink {
  constructor(kind,selected,log){this.kind=kind;this.selected=selected;this.log=log;this.responses=new Responses();this.cancelled=false;}
  async open(){if(this.kind==='usb'){const info=this.selected.getInfo();check(info.usbVendorId===0x1915&&info.usbProductId===0x521f,'USB DFU bootloader (1915:521f) 포트를 선택하세요.');const slip=new SlipDecoder();this.serial=new SerialChannel(this.selected,async b=>{await this.log('rx',b);for(const p of slip.feed(b))this.responses.push(p);},e=>this.responses.fail(e));await this.serial.open();const ping=await this.command(Uint8Array.of(9,1));check(ping.length===1&&ping[0]===1,'DFU ping');await this.command(Uint8Array.of(2,0,0));const mtu=await this.command(Uint8Array.of(7));check(mtu.length===2,'DFU MTU');this.packetBytes=Math.floor(((mtu[0]|mtu[1]<<8)-1)/2)-1;check(this.packetBytes>=1&&this.packetBytes<=4096,'DFU MTU 범위');}
    else{check(this.selected.name==='DfuTarg','DfuTarg를 선택하세요.');this.device=this.selected;const server=await this.device.gatt.connect(),service=await server.getPrimaryService(DFU_SERVICE);this.cp=await service.getCharacteristic(CP);this.packet=await service.getCharacteristic(PKT);this.notify=e=>{const b=new Uint8Array(e.target.value.buffer,e.target.value.byteOffset,e.target.value.byteLength).slice();this.log('rx',b).then(()=>this.responses.push(b)).catch(e=>this.responses.fail(e));};this.cp.addEventListener('characteristicvaluechanged',this.notify);await this.cp.startNotifications();await this.command(Uint8Array.of(2,1,0));this.packetBytes=20;}}
  async response(op){const b=await this.responses.take();check(b.length>=3&&b[0]===0x60&&b[1]===op,'DFU 응답 opcode 불일치');const names={2:'NotSupported',3:'InvalidParameter',4:'InsufficientResources',5:'InvalidObject',6:'InvalidSignature',7:'UnsupportedType',8:'OperationNotPermitted',10:'OperationFailed',11:'ExtendedError'};check(b[2]===1,`DFU ${names[b[2]]||b[2]} (op ${op}, extended ${b[3]??'—'})`);return b.slice(3);}
  async command(b){check(!this.cancelled,'DFU 취소');await this.log('tx',b);if(this.kind==='usb')await this.serial.write(slipEncode(b));else await this.cp.writeValueWithResponse(b);return this.response(b[0]);}
  async select(type){const [max,offset,crc]=values(await this.command(Uint8Array.of(6,type)),3);check(max>0&&max<=1024*1024,'DFU object 크기');return {max,offset,crc};}
  async create(type,size){await this.command(Uint8Array.of(1,type,...u32(size)));}
  async execute(){await this.command(Uint8Array.of(4));}
  async stream(data,offset,crc){for(let i=0;i<data.length;i+=this.packetBytes){check(!this.cancelled,'DFU 취소');const chunk=data.slice(i,i+this.packetBytes);await this.log('tx_packet',chunk);if(this.kind==='usb')await this.serial.write(slipEncode(Uint8Array.of(8,...chunk)));else{await this.packet.writeValueWithoutResponse(chunk);await sleep(2);}offset+=chunk.length;crc=crc32(chunk,crc);if(this.kind==='ble'){const [ro,rc]=values(await this.response(3),2);check(ro===offset&&rc===crc,'DFU PRN CRC/offset 불일치');}}
    const [ro,rc]=values(await this.command(Uint8Array.of(3)),2);check(ro===offset&&rc===crc,'DFU object CRC/offset 불일치');return crc;}
  async transfer(payload,progress){
    const c=await this.select(1),dat=payload.command,app=payload.application;check(dat.length<=c.max,'DFU init packet 크기');
    if(c.offset){check(c.offset===dat.length&&c.crc===crc32(dat),'기존 init packet 불일치/불완전 · 자동 재시도 없음');}else{await this.create(1,dat.length);await this.stream(dat,0,0);}await this.execute();progress(0,app.length,'서명 init 실행 완료');
    let {max,offset,crc}=await this.select(2);check(offset<=app.length&&crc32(app.slice(0,offset))===crc,'기존 firmware CRC 불일치 · 자동 재시도 없음');
    if(offset){const remainder=offset%max;if(remainder&&offset<app.length){const end=Math.min(offset-remainder+max,app.length);crc=await this.stream(app.slice(offset,end),offset,crc);offset=end;}await this.execute();progress(offset,app.length,'검증된 기존 object 재개');}
    for(let at=offset;at<app.length;at+=max){const b=app.slice(at,at+max);await this.create(2,b.length);crc=await this.stream(b,at,crc);await this.execute();progress(at+b.length,app.length,'object CRC + EXECUTE 확인');}
  }
  cancel(){this.cancelled=true;this.responses.fail(new Error('사용자 DFU 취소'));}
  async close(){if(this.serial)await this.serial.close();if(this.device){this.cp?.removeEventListener('characteristicvaluechanged',this.notify);try{if(this.device.gatt.connected)await this.cp?.stopNotifications();}catch{}this.device.gatt.disconnect();}}
}
