import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {ROOT,json,requireLiveAuthorization,readCredentials} from './execution-inputs.mjs';
import {beginProducer,finishProducer,getJson} from './fresh-common.mjs';
export function metadataRow(role,policy,r){
 const v=r.value;assert.equal(r.status,200);assert.equal(r.complete,true);assert.ok(r.elapsedMs>=0&&r.elapsedMs<=3000);
 assert.equal(v?.id,policy[role+'Ref']);assert.equal(v.organization_id,policy.organizationId);assert.equal(v.region,'ap-northeast-1');assert.equal(v.status,role==='recovery'?'INACTIVE':'ACTIVE_HEALTHY');assert.equal(v.database?.host,'db.'+v.id+'.supabase.co');assert.match(v.database.postgres_engine,/^17(?:\.|$)/);
 return {role,startedAt:r.startedAt,completedAt:r.completedAt,httpStatus:r.status,complete:r.complete,id:v.id,organization_id:v.organization_id,region:v.region,status:v.status,database:{host:v.database.host,postgres_engine:v.database.postgres_engine}};
}
export async function collectMetadata(which){
 requireLiveAuthorization();assert.ok(['first','second'].includes(which));
 if(which==='second'){const first=json(ROOT+'/fresh/metadata-first.json');const remaining=first.completedAt+10000-Date.now();if(remaining>0){assert.ok(remaining<=10000);await new Promise(r=>setTimeout(r,remaining));}assert.ok(Date.now()-first.completedAt<=30000,'METADATA_PAIR_WINDOW_EXPIRED');}
 const context=beginProducer('metadata','metadata-'+which),plan=json(ROOT+'/control/billing-reviewed.json').find(r=>r.service==='supabase');
 assert.equal(plan.free,true);assert.equal(plan.spendCapEnabled,true);assert.ok(plan.capturedAt>=context.approval.authorizedAt&&context.allocation.allocatedAt-plan.capturedAt<=1800000);
 const credentials=readCredentials();assert.match(credentials.metadataReadPat,/^sbp_fc[A-Za-z0-9._-]{20,512}$/);assert.notEqual(credentials.metadataReadPat,credentials.controllerPat);assert.notEqual(credentials.metadataReadPat,credentials.configurationToken);
 const roles=['preview','recovery','production'];
 const results=await Promise.all(roles.map(async role=>metadataRow(role,context.authorized.policy,await getJson({hostname:'api.supabase.com',route:'/v1/projects/'+context.authorized.policy[role+'Ref'],headers:{Authorization:'Bearer '+credentials.metadataReadPat},limit:65536}))));
 if(which==='second'){const first=json(ROOT+'/fresh/metadata-first.json');assert.ok(context.startedAt-first.completedAt>=10000&&context.startedAt-first.completedAt<=30000);}
 return finishProducer(context,{projectOperations:0,productionSqlOrConfig:0,plan:'free',planObservedAt:plan.capturedAt,projects:results});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){try{requireLiveAuthorization();assert.equal(process.argv.length,3);console.log(JSON.stringify(await collectMetadata(process.argv[2])));}catch{console.log(JSON.stringify({status:'FRESH_METADATA_REJECTED'}));process.exitCode=1;}}
