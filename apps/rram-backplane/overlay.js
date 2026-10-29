// Display-only sweep slots. No raw records are deleted by replacing a curve.
export class SweepOverlay {
  constructor(){this.dut=null;this.runs=new Map();this.revision=0;}
  add(run){if(!run?.request)return;this.dut=run.request.dut;this.runs.set(`${this.dut}:${run.request.endpoint_mV}`,run);this.revision++;}
  visible(){return [...this.runs.values()].filter(r=>r.request.dut===this.dut).sort((a,b)=>a.request.endpoint_mV-b.request.endpoint_mV);}
  clear(){for(const [key,r] of this.runs)if(r.request.dut===this.dut)this.runs.delete(key);this.revision++;}
}
