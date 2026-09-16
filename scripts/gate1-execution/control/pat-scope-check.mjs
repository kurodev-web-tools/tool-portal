import {validatePatReview,PAT_PERMISSIONS as permissions,PAT_TARGETS as allowed} from '../fresh-evidence.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,json,requireLiveAuthorization,readCredentials,sha} from '../execution-inputs.mjs';
import {getJson} from '../fresh-common.mjs';
const a=requireLiveAuthorization(),c=readCredentials(),review=json(ROOT+'/control/pat-scopes-reviewed.json'),sealed=json(ROOT+'/control/credentials-sealed.json');
const startedAt=Date.now();validatePatReview(review,sealed,a,startedAt);
assert.equal(new Set(Object.keys(permissions).map(r=>c[r])).size,3);
fs.writeFileSync(ROOT+'/control/pat-scope-claimed.json',JSON.stringify({at:startedAt,managementGets:9,manifestSha256:a.manifestSha256})+'\n',{flag:'wx'});
const rows=await Promise.all(Object.keys(permissions).flatMap(credentialRole=>['preview','recovery','production'].map(async projectRole=>{
 const r=await getJson({hostname:'api.supabase.com',route:'/v1/projects/'+a.policy[projectRole+'Ref'],headers:{Authorization:'Bearer '+c[credentialRole]},limit:65536});
 assert.equal(r.complete,true);assert.ok(r.bodyBytes>0&&r.bodyBytes<=65536&&r.elapsedMs<=3000);const permitted=allowed[credentialRole].includes(projectRole);
 if(permitted){const v=r.value;assert.equal(r.status,200);assert.equal(v.id,a.policy[projectRole+'Ref']);assert.equal(v.organization_id,a.policy.organizationId);assert.equal(v.region,'ap-northeast-1');assert.ok(v.database?.version?.startsWith('17.'));assert.equal(v.database.host,'db.'+v.id+'.supabase.co');assert.equal(v.status,projectRole==='recovery'?'INACTIVE':'ACTIVE_HEALTHY');}else assert.ok([403,404].includes(r.status));
 return {credentialRole,projectRole,httpStatus:r.status,complete:r.complete,permitted,inputSha256:sealed.inputs.find(x=>x.role===credentialRole).inputSha256};
})));
const receipt={status:'PAT_PROJECT_SCOPE_VERIFIED',startedAt,completedAt:Date.now(),manifestSha256:a.manifestSha256,rows,allowed:rows.filter(x=>x.permitted).length,denied:rows.filter(x=>!x.permitted).length,oldPatQueries:0};
fs.writeFileSync(ROOT+'/control/pat-scope-verified.json',JSON.stringify(receipt)+'\n',{flag:'wx'});console.log(JSON.stringify({status:receipt.status,allowed:6,denied:3}));
