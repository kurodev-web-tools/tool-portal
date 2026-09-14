// Diagnostic data never grants acceptance, renews a lease or permits a retry.
export const MUTATION_DIAGNOSTICS_HEADER='X-Controller-Mutation-Diagnostics';
const operations=['previewPause','recoveryResume','recoveryPause','previewResume'];
const stages=new Set(['FETCH','HEADERS','BODY','DECODE','JSON','COMPLETE','DISPATCH']);
const codes=new Set(['FETCH_FAILED','REDIRECT','HTTP_STATUS','BODY_FAILED','BODY_LIMIT','UTF8_INVALID','JSON_INVALID','BODY_SHAPE','CLOCK_WINDOW','DEADLINE','ACCEPTED_EMPTY','ACCEPTED_OBJECT','DISPATCH_GUARD']);
const exact=(value,keys)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');
export function validMutationObservation(value){
 return exact(value,['stage','code','httpStatus','bodyBytes','bodyComplete','elapsedMs'])&&stages.has(value.stage)&&codes.has(value.code)&&(value.httpStatus===null||Number.isInteger(value.httpStatus)&&value.httpStatus>=100&&value.httpStatus<=599)&&Number.isInteger(value.bodyBytes)&&value.bodyBytes>=0&&value.bodyBytes<=65537&&typeof value.bodyComplete==='boolean'&&(value.elapsedMs===null||Number.isSafeInteger(value.elapsedMs)&&value.elapsedMs>=0&&value.elapsedMs<=3600000);
}
export function mutationDiagnosticsHeader(state){
 if(!state||!/^[a-f0-9]{64}$/.test(state.runId??''))return null;
 const rows={};for(const operation of operations){const value=state.operations?.[operation];if(value&&['ACCEPTED','UNKNOWN'].includes(value.outcome)&&validMutationObservation(value.observation))rows[operation]={outcome:value.outcome,observation:{...value.observation}};}
 return Object.keys(rows).length?JSON.stringify({schemaVersion:1,runId:state.runId,operations:rows}):null;
}
export function parseMutationDiagnosticsHeader(source){
 try{
  if(typeof source!=='string'||source.length>4096)return null;const value=JSON.parse(source);
  if(JSON.stringify(value)!==source||!exact(value,['schemaVersion','runId','operations'])||value.schemaVersion!==1||!/^[a-f0-9]{64}$/.test(value.runId??'')||!value.operations||typeof value.operations!=='object'||Array.isArray(value.operations))return null;
  const keys=Object.keys(value.operations);if(keys.length<1||keys.length>4||keys.some(k=>!operations.includes(k)))return null;
  for(const row of Object.values(value.operations))if(!exact(row,['outcome','observation'])||!['ACCEPTED','UNKNOWN'].includes(row.outcome)||!validMutationObservation(row.observation))return null;
  return value;
 }catch{return null;}
}
