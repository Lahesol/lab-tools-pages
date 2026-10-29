// Read-only, derived CSV/table views. Never send device commands or alter raw.
import {adcValues,decodeAdc} from './protocol.js';
const cell=x=>x===null||x===undefined?'':/[",\r\n]/.test(String(x))?'"'+String(x).replaceAll('"','""')+'"':String(x);
export const csv=rows=>'\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
export function pointTableRows(run){
  if(!run)return [];
  if(run.crc_verified&&run.point_rows)return run.point_rows.map(p=>({...p,provisional:false}));
  // SP transmits sums, not the three individual currents. Do not invent a
  // per-scan SD or a validated point resistance from this live preview.
  return (run.points||[]).map(p=>({index:p.index,target_mV:p.target_mV,voltage_V:p.te_be_sense_V,
    force_V:p.force_V,current_mA:p.current_mA,settled_frames:p.settled_frames,
    resistance_ohms:null,current_sd_mA:null,below_current_floor:null,compliance:p.compliance,provisional:true}));
}
export function pointRowsCsv(rows){
  const fields=['index','target_mV','dac_code','pupd','applied_us','voltage_V','force_V','current_mA','current_sd_mA','settled_frames','resistance_ohms','compliance','below_current_floor'];
  return csv([fields,...rows.map(p=>fields.map(k=>p[k]))]);
}
export function adcLogCsv(wire){
  const raw=Array.from({length:8},(_,i)=>'AIN'+i+'_raw'),volts=Array.from({length:8},(_,i)=>'AIN'+i+'_derived_V');
  const rows=[['at_utc','source','adc_bits',...raw,...volts,'current_mA','feedback_V','force_V']];
  for(const r of wire){if(r.direction!=='rx'||r.kind!=='line'||!/^A(?:12|14),/.test(r.line))continue;
    const a=decodeAdc(r.line),v=adcValues(a.raw,a.bits);rows.push([r.at_utc,r.source,a.bits,...a.raw,...v.volts,v.current_mA,v.feedback_V,v.force_V]);
  }
  return {text:csv(rows),frames:rows.length-1};
}
