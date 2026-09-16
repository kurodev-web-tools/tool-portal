import {verifyHistory,historyValue} from '../accepted-history.mjs';
import fs from 'node:fs';
import {guard,ROOT,CONTROL,json,save,check,sha,readCredentials} from './common.mjs';
import {createControllerHttpsTransport} from '../../lib/comment-translator-paid-core-v1-gate1-controller-client.mjs';
import {classifyClosingState} from '../closing-contract.mjs';
import {controllerBudget} from '../http-budget.mjs';
const a=guard({closure:true}),label=process.argv[2];check(['initial','terminal','deadline'].includes(label));
const runtime=ROOT+'/runtime',identity=fs.existsSync(runtime+'/identity.json')?json(runtime+'/identity.json'):null;
const journals=fs.existsSync(runtime)?fs.readdirSync(runtime).filter(n=>/^client-.*\.jsonl$/.test(n)):[];check(journals.length<=1);
const rows=journals.length?fs.readFileSync(runtime+'/'+journals[0],'utf8').trim().split('\n').filter(Boolean).map(s=>JSON.parse(s).payload):[];
const attempts=rows.filter(r=>r.event==='HTTP_ATTEMPT'),counts={clientGets:attempts.filter(r=>r.method==='GET').length,clientPosts:attempts.filter(r=>r.method==='POST').length};
const externalGets=fs.readdirSync(CONTROL).filter(n=>/^closing-state-(initial|terminal|deadline)-claimed\.json$/.test(n)).length;
controllerBudget({reserve:3});check(counts.clientPosts<=32&&counts.clientGets+externalGets+4<=96);
save('closing-state-'+label+'-claimed.json',{at:Date.now(),method:'GET',route:'/v1/state',...counts,independentGets:externalGets+1});
const response=await createControllerHttpsTransport({origin:a.manifest.controllerOrigin,operatorToken:readCredentials().operatorToken})('/v1/state');
check([200,503].includes(response.status));let state=JSON.parse(response.body),disabled=response.status===503;
if(disabled){check(state.error==='DISABLED');for(const stage of ['secrets','deploy-live','arm'])check(!fs.existsSync(ROOT+'/control/steps/'+stage+'-claimed.json'));const history=historyValue(await verifyHistory(a));state=history.state??history.controllerState;}
// Persist even a non-terminal observation; never turn UNKNOWN into closure.
const value={at:Date.now(),httpStatus:response.status,complete:true,error:disabled?'DISABLED':null,bodySha256:sha(response.body),runIdMatches:state.runId===identity?.runId,state};save('closing-state-'+label+'.json',value);
let classification;try{classification=classifyClosingState(state,{runId:identity?.runId,predecessor:a.predecessor});}catch{classification={kind:'NOT_SAFE_TO_DISABLE',formalProofRequired:true};}
console.log(JSON.stringify({httpStatus:response.status,phase:state.phase,reason:state.reason,classification,...counts,independentGets:externalGets+1}));
