import {SOURCE_ROOT} from '../execution-inputs.mjs';
import {guard,cli,check,json,save,CONTROL} from './common.mjs';
guard({closure:true});check(json(CONTROL+'/secret-closure.json').status==='PAT_OPERATOR_AND_GRANT_SECRETS_REMOVED');check(json(CONTROL+'/final-worker-closed.json').httpStatus===503);
save('oauth-logout-claimed.json',{at:Date.now(),scope:'THIS_LIVE_TRIAL_OAUTH_ONLY'});
const r=cli(['logout'],{timeout:30000,extra:['--import',SOURCE_ROOT+'/control/logout-observe.mjs']});const after=cli(['whoami','--json']);let v;try{v=JSON.parse(after.stdout)}catch{}const rev=json(CONTROL+'/oauth-revoke-response.json');
const value={at:Date.now(),logoutExitCode:r.status,successMessageObserved:r.stdout.includes('Successfully logged out.'),whoamiExitCode:after.status,loggedIn:v?.loggedIn??null,revokeHttpStatus:rev.statusCode};save('oauth-logout-result.json',value);console.log(JSON.stringify(value));check(value.logoutExitCode===0&&value.successMessageObserved&&value.loggedIn===false&&value.revokeHttpStatus===200,'OAUTH_CLOSURE_UNCONFIRMED');
