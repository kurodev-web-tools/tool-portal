import {verifyClosingEnvironment} from '../run-closure.mjs';
import fs from 'node:fs';
import {guard,cli,check,json,save,ROOT,CONTROL,config,workerName} from './common.mjs';
import {loadGrantForAdmission} from '../safe-closure-inputs.mjs';
const stage=process.argv[2],auth=guard({closure:stage==='close'});check(['live','close'].includes(stage));check(json(CONTROL+'/oauth-identity.json').expectedAccountMatch===true);check(json(CONTROL+'/pat-scope-verified.json').status==='PAT_PROJECT_SCOPE_VERIFIED');
if(stage==='live'){loadGrantForAdmission();check(Date.now()-json(CONTROL+'/version-secrets.json').at<300000);const v=json(CONTROL+'/version-secrets.json');check(v.mode==='disabled'&&v.encryptedSecrets===json(CONTROL+'/initial-secrets-result.json').names.length&&v.activeVersionConfirmed);}
if(stage==='close'){await verifyClosingEnvironment(auth);const v=json(CONTROL+'/safe-closure.json');check(v.safeToDisable===true&&v.previewRestored===true&&v.recoveryStopped===true);}
save('deploy-'+stage+'-claimed.json',{at:Date.now(),stage,bundleSha256:auth.manifest.controllerBundleSha256,codeDeployAllowance:2});
const args=['deploy','--config',config,'--no-bundle'];if(stage==='live')args.push('--var','CONTROLLER_MODE:live');
const r=cli(args,{timeout:120000}),output=(r.stdout??'')+'\n'+(r.stderr??''),version=output.match(/Current Version ID:\s*([a-f0-9-]{36})/i)?.[1]??null;
const receipt={at:Date.now(),stage,status:r.status===0&&version&&output.includes(auth.manifest.controllerOrigin)?'DEPLOYED_VERSION_RECORDED':'DEPLOYMENT_UNCONFIRMED',exitCode:r.status,version,workerName,mode:stage==='live'?'live':'disabled',bundleSha256:auth.manifest.controllerBundleSha256,errorCodes:[...output.matchAll(/\[code:\s*(\d+)\]/g)].map(m=>m[1]),timedOut:r.error?.code==='ETIMEDOUT'};save('deploy-'+stage+'-result.json',receipt);console.log(JSON.stringify(receipt));check(receipt.status==='DEPLOYED_VERSION_RECORDED');
