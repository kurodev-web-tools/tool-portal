import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRehearsalServiceChange,validateConfigurationRequest,compareConfigurationReadback} from './lib/comment-translator-paid-core-v1-gate1-rehearsal-configuration.mjs';
const projectRef='abcdefghijklmnopqrst';
const before=()=>({db_schema:'public, graphql_public',max_rows:1000,db_extra_search_path:'public, extensions',db_pool:null,db_pool_acquisition_timeout:10});
test('Data API closes by empty schema and restores the captured exact schema string',()=>{
 const r=buildRehearsalServiceChange('postgrest',before(),{db_schema:''});
 assert.deepEqual(r.patch,{db_schema:''});assert.deepEqual(r.inverse,{db_schema:'public, graphql_public'});
 assert.equal(compareConfigurationReadback(r,{...before(),db_schema:''}),true);
 assert.equal(r.hostedReady,false);
});
test('Dashboard companion fields are allowed only when unchanged and known',()=>{
 const r=buildRehearsalServiceChange('postgrest',before(),{db_schema:''});
 const request={method:'PATCH',url:'https://api.supabase.com/platform/projects/'+projectRef+'/config/postgrest',postData:JSON.stringify({db_schema:'',max_rows:1000,db_extra_search_path:'public, extensions'})};
 assert.equal(validateConfigurationRequest(r,request,{projectRef,origin:'https://api.supabase.com',style:'dashboard'}),true);
 for(const postData of [JSON.stringify({db_schema:'',max_rows:900}),JSON.stringify({db_schema:'',smtp_pass:'private'}),'{"db_schema":"public","db_schema":""}'])
 assert.throws(()=>validateConfigurationRequest(r,{...request,postData},{projectRef,origin:'https://api.supabase.com',style:'dashboard'}));
});
test('a wrong target, URL credentials, query, method or redirect destination cannot carry a configuration write',()=>{
 const r=buildRehearsalServiceChange('realtime',{suspend:false},{suspend:true});
 const request={method:'PATCH',url:'https://api.supabase.com/v1/projects/'+projectRef+'/config/realtime',postData:'{"suspend":true}'};
 assert.equal(validateConfigurationRequest(r,request,{projectRef,origin:'https://api.supabase.com',style:'management'}),true);
 for(const url of [request.url.replace(projectRef,'bbbbbbbbbbbbbbbbbbbb'),request.url+'?secret=x',request.url.replace('https://','https://user:pass@'),request.url.replace('api.supabase.com','example.com')])
 assert.throws(()=>validateConfigurationRequest(r,{...request,url},{projectRef,origin:'https://api.supabase.com',style:'management'}));
 assert.throws(()=>validateConfigurationRequest(r,{...request,method:'POST'},{projectRef,origin:'https://api.supabase.com',style:'management'}));
});
test('unknown updates, secret values and unexpected readback differences are rejected',()=>{
 assert.throws(()=>buildRehearsalServiceChange('postgrest',before(),{db_schema:'auth'}));
 assert.throws(()=>buildRehearsalServiceChange('postgrest',before(),{max_rows:5000}));
 assert.throws(()=>buildRehearsalServiceChange('auth',{external_email_enabled:false,smtp_pass:'private'},{external_email_enabled:true}));
 const r=buildRehearsalServiceChange('postgrest',before(),{db_schema:''});
 assert.throws(()=>compareConfigurationReadback(r,{...before(),db_schema:'',db_pool:30}));
 assert.throws(()=>compareConfigurationReadback(r,{db_schema:''}));
});
