import {ROOT,SOURCE_ROOT,REPOSITORY,isolatedChildEnvironment,requireLiveAuthorization} from '../execution-inputs.mjs';
import {launchOwnedNode} from '../native-io.mjs';
try{
 const context=requireLiveAuthorization();process.chdir(REPOSITORY);await import('./client-start-guard.mjs');
 const value=await launchOwnedNode({file:SOURCE_ROOT+'/live-session.mjs',args:['--execute'],cwd:REPOSITORY,env:isolatedChildEnvironment(context),out:ROOT+'/client-stdout.jsonl',err:ROOT+'/client-stderr.txt',receipt:ROOT+'/control/client-process.json',identity:{runAllowance:1}});console.log(JSON.stringify(value));
}catch{console.log(JSON.stringify({status:'CLIENT_LAUNCH_REJECTED',automaticRetry:false}));process.exitCode=1;}
