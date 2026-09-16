import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {ROOT,REPOSITORY,sha,json,requireLiveAuthorization,readDpapi,readCredentials as credentials,isolatedChildEnvironment} from '../execution-inputs.mjs';
import {protect as protectInput} from './credential-intake.mjs';
export {ROOT,sha,json,readDpapi};
export const CONTROL=ROOT+'/control',config=ROOT+'/wrangler.live.json',workerName='v-streamer-tools-gate1-recovery-controller-live';
export const scopes=['account:read','offline_access','user:read','workers_scripts:write'];
export const check=(x,message='PRECONDITION_REJECTED')=>assert.ok(x,message);
export const save=(name,value)=>{check(/^[a-z0-9-]+\.json$/.test(name));fs.writeFileSync(CONTROL+'/'+name,JSON.stringify(value)+'\n',{flag:'wx'});};
let closing=false;
export function guard({closure=false}={}){closing ||= closure;const a=requireLiveAuthorization({closure:closing});check(a.approval.emergencyPreviewResume===true);check(path.resolve(process.cwd())===REPOSITORY);return a;}
export const readCredentials=()=>credentials({closure:closing});
export function cli(args,{timeout=30000,input,extra=[]}={}){
 const a=guard();return spawnSync(process.execPath,[...extra,path.join(REPOSITORY,'node_modules/wrangler/bin/wrangler.js'),...args],{cwd:REPOSITORY,input,encoding:'utf8',shell:false,windowsHide:true,timeout,maxBuffer:1048576,env:{...isolatedChildEnvironment(a),CLOUDFLARE_ACCOUNT_ID:json(config).account_id}});
}
export function protect(value,file){const a=guard();return protectInput(a,value,path.relative(ROOT,file));}
