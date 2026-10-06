import {check} from './protocol.js';
const promise=request=>new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
export class Journal {
  async open(){const r=indexedDB.open('rram-backplane-web-v1',1);r.onupgradeneeded=()=>{r.result.createObjectStore('runs',{keyPath:'id'});r.result.createObjectStore('wire',{keyPath:['run_id','seq']});};this.db=await promise(r);}
  async transaction(store,fn){check(this.db,'자동 저장 초기화 실패');const tx=this.db.transaction(store,'readwrite',{durability:'strict'});const finished=new Promise((r,j)=>{tx.oncomplete=r;tx.onabort=()=>j(tx.error||new Error('저장 transaction 중단'));tx.onerror=()=>j(tx.error);});fn(tx.objectStore(store));await finished;}
  async run(data){await this.transaction('runs',s=>s.put(data));}
  async append(record){await this.transaction('wire',s=>s.add(record));}
  async get(id){return promise(this.db.transaction('runs').objectStore('runs').get(id));}
  async list(){return promise(this.db.transaction('runs').objectStore('runs').getAll());}
  async wire(id){return promise(this.db.transaction('wire').objectStore('wire').getAll(IDBKeyRange.bound([id,0],[id,Number.MAX_SAFE_INTEGER])));}
  async directory(){check('showDirectoryPicker' in window,'폴더 저장은 File System Access 지원 브라우저가 필요합니다.');this.folder=await window.showDirectoryPicker({mode:'readwrite'});}
  async saveFiles(id,files){if(!this.folder)return false;const dir=await this.folder.getDirectoryHandle(id,{create:true});for(const [name,data] of Object.entries(files)){check(!name.includes('/'),'저장 파일 경로');const h=await dir.getFileHandle(name,{create:true});const w=await h.createWritable();await w.write(data instanceof Uint8Array?data:typeof data==='string'?data:JSON.stringify(data,null,2));await w.close();}return true;}
}
