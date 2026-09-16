import {ROOT,requireLiveAuthorization,REPOSITORY} from '../execution-inputs.mjs';
import {runOAuthLauncher} from '../oauth-launcher.mjs';
try{process.chdir(REPOSITORY);await runOAuthLauncher(requireLiveAuthorization(),{out:r=>console.log(JSON.stringify(r))});console.log(JSON.stringify({status:'OAUTH_PREPARATION_COMPLETE'}));}catch{console.log(JSON.stringify({status:'OAUTH_PREPARATION_UNCONFIRMED'}));process.exitCode=1;}
