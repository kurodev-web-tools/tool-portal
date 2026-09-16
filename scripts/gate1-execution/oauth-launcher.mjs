import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {LIMITS,REPOSITORY,isolatedChildEnvironment,executionNow,record,json} from './execution-inputs.mjs';
import {preparationClock} from './prearm-sequence.mjs';
import {OAUTH_SCOPES} from './native-io.mjs';

export async function runOAuthLauncher(context,{out=()=>{}}={}){
 const root=context.root,env=isolatedChildEnvironment(context),startedAt=executionNow(context),p=json(root+'/control/preparation-claimed.json');
 const deadlineAt=Math.min(preparationClock(context.approval,p.startedAt,startedAt),startedAt+LIMITS.oauth);
 const wrangler=path.join(REPOSITORY,'node_modules/wrangler/bin/wrangler.js');
 if(!context.local){const before=spawnSync(process.execPath,[wrangler,'whoami','--json'],{env,encoding:'utf8',windowsHide:true,shell:false,timeout:20000,maxBuffer:1048576});assert.equal(before.status,1);assert.equal(JSON.parse(before.stdout).loggedIn,false);}
 record(root,'control/oauth-login-claimed.json',{at:startedAt,deadlineAt,previouslyLoggedIn:false,scopes:OAUTH_SCOPES,manifestSha256:context.manifestSha256});
 let oauthUrl=null,consumed=false,invalid=false,buffer='',child,timer,port;
 const server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(executionNow(context)>=deadlineAt){invalid=true;child?.kill();res.writeHead(404);res.end();return;}
  if(req.headers.host!=='127.0.0.1:'+port||req.method!=='GET'||req.url!=='/start'||!oauthUrl||consumed||executionNow(context)>=deadlineAt){res.writeHead(404);res.end();return;}
  consumed=true;res.writeHead(302,{Location:oauthUrl});res.end();oauthUrl=null;
  if(context.local)child.stdin.end('LOCAL_OPERATOR_COMPLETED\n');
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.maxConnections=4;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(context.local?0:8977,'127.0.0.1',resolve);});port=server.address().port;
 const args=context.local?[path.join(REPOSITORY,'scripts/fixtures/gate1-oauth-child.mjs')]:[wrangler,'login','--scopes','account:read','user:read','workers_scripts:write','--browser=false','--callback-host','localhost','--callback-port','8976'];
 const done=new Promise(resolve=>{
  child=spawn(process.execPath,args,{cwd:root,env,shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
  record(root,'control/oauth-process.json',{processId:child.pid,startedAt,manifestSha256:context.manifestSha256});
  const capture=b=>{buffer+=b;if(Buffer.byteLength(buffer)>131072){invalid=true;child.kill();return;}
   const match=buffer.match(context.local?/https:\/\/oauth\.invalid\/authorize\?[^\s]+/:/https:\/\/dash\.cloudflare\.com\/oauth2\/auth\?[^\s]+/);
   if(match&&!oauthUrl&&!consumed){const url=new URL(match[0]),actual=(url.searchParams.get('scope')??'').split(' ').sort();if(JSON.stringify(actual)!==JSON.stringify(OAUTH_SCOPES)){invalid=true;child.kill();return;}oauthUrl=url.href;buffer='';out({status:'OAUTH_UI_READY',launcher:'http://127.0.0.1:'+port+'/start',requestedScopes:actual});}
  };
  child.stdout.on('data',capture);child.stderr.on('data',capture);child.stdin.on('error',()=>{invalid=true;});
  child.once('error',()=>{invalid=true;});child.once('close',(code,signal)=>resolve({code,signal,completedAt:executionNow(context)}));
  timer=setTimeout(()=>{invalid=true;child.kill();},Math.max(1,deadlineAt-executionNow(context)));
 });
 const result=await done;clearTimeout(timer);
 await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});
 const value={status:result.code===0&&!invalid&&consumed&&result.completedAt<deadlineAt?'OAUTH_LOGIN_PROCESS_EXITED':'OAUTH_LOGIN_NOT_ACCEPTED',exitCode:result.code,signal:result.signal,startedAt,completedAt:result.completedAt,deadlineAt,uiConsumed:consumed,listeners:0,processId:child.pid,manifestSha256:context.manifestSha256};record(root,'control/oauth-login-result.json',value);
 assert.equal(value.status,'OAUTH_LOGIN_PROCESS_EXITED');return value;
}
