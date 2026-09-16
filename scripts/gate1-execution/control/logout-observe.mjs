import {ROOT} from '../execution-inputs.mjs';
import {channel} from 'node:diagnostics_channel';
import fs from 'node:fs';
channel('undici:request:headers').subscribe(message=>{
  if(String(message.request.origin)==='https://dash.cloudflare.com'&&message.request.path==='/oauth2/revoke'){
    fs.writeFileSync((ROOT+'/control/oauth-revoke-response.json'),JSON.stringify({at:new Date().toISOString(),statusCode:message.response.statusCode})+'\n',{flag:'wx'});
  }
});
