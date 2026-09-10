const assert=require('node:assert/strict');
require('node:dns').setDefaultResultOrder('ipv4first');
const http=require('node:http');
let raw='';process.stdin.on('data',b=>raw+=b);process.stdin.on('end',async()=>{
 const {token,closedOnly}=JSON.parse(raw),report={status:'FAIL'},sockets=[];
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 let phase='positive_socket';
 const api=async(path,body,method='GET')=>{const r=await fetch('http://127.0.0.1:4000'+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(4000)});let data;try{data=await r.json();}catch{data=null;}return {status:r.status,data};};
 const open=async()=>{const ws=new WebSocket('ws://127.0.0.1:4000/socket/websocket?vsn=2.0.0&apikey='+encodeURIComponent(token));sockets.push(ws);ws.binaryType='arraybuffer';const messages=[];ws.addEventListener('message',e=>{try{if(typeof e.data==='string'){messages.push(JSON.parse(e.data));}else{const b=Buffer.from(e.data);assert.equal(b[0],4);assert.equal(b[4],1);const topic=b.subarray(5,5+b[1]).toString(),event=b.subarray(5+b[1],5+b[1]+b[2]).toString(),payload=JSON.parse(b.subarray(5+b[1]+b[2]+b[3]).toString());messages.push([null,null,topic,'broadcast',{event,payload}]);}}catch{report.decodeFailures=(report.decodeFailures??0)+1;}});await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('OPEN_TIMEOUT')),4000);ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('OPEN_ERROR'));},{once:true});});return {ws,messages};};
 const awaitMessage=async(sock,pred)=>{for(let i=0;i<60;i++){const m=sock.messages.find(pred);if(m)return m;await delay(50);}throw Error('MESSAGE_TIMEOUT');};
 const join=async(sock)=>{sock.ws.send(JSON.stringify(['1','1','realtime:fixture','phx_join',{config:{broadcast:{ack:true,self:true},presence:{key:'fixture'},postgres_changes:[]},access_token:token}]));const reply=await awaitMessage(sock,m=>m[1]==='1'&&m[3]==='phx_reply');assert.equal(reply[4]?.status,'ok');};
 const broadcast=async(sock,ref)=>{sock.ws.send(JSON.stringify(['1',ref,'realtime:fixture','broadcast',{type:'broadcast',event:'closure-control',payload:{ref}}]));await awaitMessage(sock,m=>m[3]==='broadcast'&&m[4]?.payload?.ref===ref);};
 const handshake=()=>new Promise((resolve,reject)=>{const r=http.request({hostname:'127.0.0.1',port:4000,path:'/socket/websocket?vsn=2.0.0&apikey='+encodeURIComponent(token),headers:{Host:'127.0.0.1:4000',Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':Buffer.alloc(16,3).toString('base64')},timeout:4000});r.on('response',x=>{x.resume();resolve(x.statusCode);});r.on('upgrade',(x,s)=>{s.destroy();resolve(x.statusCode);});r.on('error',e=>reject(Object.assign(Error('HANDSHAKE_ERROR'),{code:['ECONNRESET','ECONNREFUSED','EPIPE'].includes(e.code)?e.code:'TRANSPORT_ERROR'})));r.on('timeout',()=>{r.destroy();reject(Error('HANDSHAKE_TIMEOUT'));});r.end();});
 try{
  if(closedOnly){
   report.reconnectStatus=await handshake();assert.equal(report.reconnectStatus,403);
   report.httpSuspendedStatus=(await api('/api/broadcast',{messages:[{topic:'fixture',event:'closed-probe',payload:{fixture:true}}]},'POST')).status;
   report.singleSuspendedStatus=(await api('/api/broadcast/fixture/events/closed-probe',{fixture:true},'POST')).status;
   assert.equal(report.httpSuspendedStatus,403);assert.equal(report.singleSuspendedStatus,403);report.status='PASS';return;
  }
  report.readinessTransportErrors=[];for(let i=0;i<5;i++){try{report.initialHandshakeStatus=await handshake();if(report.initialHandshakeStatus===101)break;}catch(e){report.readinessTransportErrors.push(e.code??'TRANSPORT_ERROR');}await delay(400);}assert.equal(report.initialHandshakeStatus,101);const first=await open();phase='positive_join';await join(first);phase='positive_broadcast';await broadcast(first,'2');report.initialBroadcastAccepted=true;
  phase='http_positive';const batch={messages:[{topic:'fixture',event:'http-control',payload:{fixture:true}}]};const positive=await api('/api/broadcast',batch,'POST');report.httpPositiveStatus=positive.status;assert.equal(positive.status,202);await awaitMessage(first,m=>m[3]==='broadcast'&&m[4]?.event==='http-control');report.httpPositiveDelivered=true;
  const single=await api('/api/broadcast/fixture/events/single-control',{fixture:true},'POST');report.singlePositiveStatus=single.status;assert.equal(single.status,202);await awaitMessage(first,m=>m[3]==='broadcast'&&m[4]?.event==='single-control');report.singlePositiveDelivered=true;

  phase='suspend';const closedAt=Date.now();const suspend=await api('/api/tenants/127',{tenant:{suspend:true}},'PUT');report.suspendStatus=suspend.status;assert.equal(suspend.status,200);
  const readback=await api('/api/tenants/127');assert.equal(readback.status,200);report.suspendReadback=readback.data?.data?.suspend??readback.data?.suspend??null;report.suspendFieldOmittedFromHttpReadback=report.suspendReadback===null;
  phase='existing_socket';for(let i=0;i<60&&first.ws.readyState!==WebSocket.CLOSED;i++)await delay(50);report.existingSocketClosed=first.ws.readyState===WebSocket.CLOSED;report.disconnectElapsedMs=Date.now()-closedAt;
  phase='reconnect';report.reconnectTransportErrors=[];for(let i=0;i<3;i++){try{report.reconnectStatus=await handshake();break;}catch(e){report.reconnectTransportErrors.push(e.code??'TRANSPORT_ERROR');await delay(300);}}assert.equal(report.reconnectStatus,403);
  assert.equal(report.existingSocketClosed,true); // No automatic second mutation.

  phase='suspended_http';report.httpSuspendedStatus=(await api('/api/broadcast',batch,'POST')).status;report.singleSuspendedStatus=(await api('/api/broadcast/fixture/events/single-control',{fixture:true},'POST')).status;assert.equal(report.httpSuspendedStatus,403);assert.equal(report.singleSuspendedStatus,403);
  phase='closed_probe_complete';

  report.status='PASS';
 }catch(e){report.phase=phase;report.failureClass=e.code??(['OPEN_TIMEOUT','OPEN_ERROR','MESSAGE_TIMEOUT','HANDSHAKE_ERROR','HANDSHAKE_TIMEOUT'].includes(e.message)?e.message:'SANITIZED_FAILURE');process.exitCode=1;}
 finally{for(const ws of sockets)try{ws.close();}catch{}process.stdout.write(JSON.stringify(report));setTimeout(()=>process.exit(process.exitCode??0),100);}
});
