import {check,crc32} from './protocol.js';
const te=new TextEncoder(),td=new TextDecoder();
export async function readZip(bytes){
  check(bytes.length<=16*1024*1024,'ZIP 16 MiB 제한');const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(d.getUint32(i,true)===0x06054b50){end=i;break;}}
  check(end>=0&&d.getUint16(end+4,true)===0&&d.getUint16(end+6,true)===0,'단일 디스크 ZIP 필요');const count=d.getUint16(end+10,true);check(count<=128,'ZIP 파일 수');let pos=d.getUint32(end+16,true),total=0;const files=new Map();
  for(let i=0;i<count;i++){
    check(pos+46<=bytes.length&&d.getUint32(pos,true)===0x02014b50,'ZIP central header');const flags=d.getUint16(pos+8,true),method=d.getUint16(pos+10,true),crc=d.getUint32(pos+16,true),compressed=d.getUint32(pos+20,true),size=d.getUint32(pos+24,true),nl=d.getUint16(pos+28,true),el=d.getUint16(pos+30,true),cl=d.getUint16(pos+32,true),local=d.getUint32(pos+42,true);
    check(!(flags&1)&&[0,8].includes(method)&&size<=8*1024*1024&&(total+=size)<=16*1024*1024,'ZIP 암호화/압축/크기 제한');
    check(pos+46+nl+el+cl<=bytes.length,'ZIP 이름 길이');const name=td.decode(bytes.slice(pos+46,pos+46+nl));check(name&&!name.startsWith('/')&&!name.includes('\\')&&!name.split('/').includes('..')&&!files.has(name),'ZIP 경로/중복 이름');
    check(local+30<=bytes.length&&d.getUint32(local,true)===0x04034b50,'ZIP local header');const start=local+30+d.getUint16(local+26,true)+d.getUint16(local+28,true);check(start+compressed<=bytes.length,'ZIP data 범위');let raw=bytes.slice(start,start+compressed);
    if(method===8){check(typeof DecompressionStream!=='undefined','이 브라우저는 ZIP 압축 해제를 지원하지 않습니다.');const reader=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let actual=0;while(true){const {value,done}=await reader.read();if(done)break;actual+=value.length;if(actual>size){await reader.cancel();throw new Error('ZIP 압축 해제 크기 초과');}chunks.push(value);}raw=new Uint8Array(actual);let at=0;for(const b of chunks){raw.set(b,at);at+=b.length;}}
    check(raw.length===size&&crc32(raw)===crc,'ZIP entry 길이/CRC');files.set(name,raw);pos+=46+nl+el+cl;
  }return files;
}
export function writeZip(files){
  const locals=[],central=[];let offset=0;
  for(const [name,value] of Object.entries(files)){const n=te.encode(name),b=value instanceof Uint8Array?value:te.encode(typeof value==='string'?value:JSON.stringify(value,null,2)),crc=crc32(b),l=new Uint8Array(30+n.length),ld=new DataView(l.buffer);ld.setUint32(0,0x04034b50,true);ld.setUint16(4,20,true);ld.setUint16(6,2048,true);ld.setUint32(14,crc,true);ld.setUint32(18,b.length,true);ld.setUint32(22,b.length,true);ld.setUint16(26,n.length,true);l.set(n,30);
    const c=new Uint8Array(46+n.length),cd=new DataView(c.buffer);cd.setUint32(0,0x02014b50,true);cd.setUint16(4,20,true);cd.setUint16(6,20,true);cd.setUint16(8,2048,true);cd.setUint32(16,crc,true);cd.setUint32(20,b.length,true);cd.setUint32(24,b.length,true);cd.setUint16(28,n.length,true);cd.setUint32(42,offset,true);c.set(n,46);locals.push(l,b);central.push(c);offset+=l.length+b.length;
  }
  const count=central.length,cs=central.reduce((s,x)=>s+x.length,0),end=new Uint8Array(22),ed=new DataView(end.buffer);ed.setUint32(0,0x06054b50,true);ed.setUint16(8,count,true);ed.setUint16(10,count,true);ed.setUint32(12,cs,true);ed.setUint32(16,offset,true);
  const result=new Uint8Array(offset+cs+22);let at=0;for(const b of [...locals,...central,end]){result.set(b,at);at+=b.length;}return result;
}
export async function sha256(bytes){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));return Array.from(h,x=>x.toString(16).padStart(2,'0')).join('');}
export function download(name,bytes,type='application/zip'){const url=URL.createObjectURL(new Blob([bytes],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
