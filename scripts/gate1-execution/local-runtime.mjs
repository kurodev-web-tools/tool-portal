import {isolatedChildEnvironment} from './execution-inputs.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Local endpoint and command arguments are fixed. No image pull, container,
// SQL connection, OAuth request or provider call is part of this check.
export function checkLocalRuntime(expected,context){
 const run=(executable,args)=>{
  const r=spawnSync(executable,args,{env:isolatedChildEnvironment(context),encoding:'utf8',shell:false,windowsHide:true,timeout:20000,maxBuffer:1048576});
  assert.equal(r.status,0,'LOCAL_RUNTIME_COMMAND_FAILED');assert.equal(r.stderr,'','LOCAL_RUNTIME_STDERR');return r.stdout.trim();
 };
 assert.equal(process.platform,'win32');
 const docker=args=>run(expected.dockerExecutable,['--host','npipe:////./pipe/dockerDesktopLinuxEngine',...args]);
 const version=JSON.parse(docker(['version','--format','{{json .}}']));assert.equal(version.Server.Version,expected.serverVersion);assert.equal(version.Server.Os,'linux');
 assert.equal(expected.images.length,6);
 // One local daemon request verifies all six identities before the UI clock.
 const images=JSON.parse(docker(['image','inspect',...expected.images.map(x=>x.tag)]));assert.equal(images.length,6);
 for(let i=0;i<images.length;i++)assert.equal(images[i].Id,expected.images[i].id);
 const bin=expected.postgresBin;
 for(const leaf of ['psql','pg_dump','pg_restore']){
  const folder=leaf==='pg_restore'?expected.restoreBin:bin;
  assert.match(run(path.join(folder,leaf+'.exe'),['--version']),/17\.11/);
 }
 assert.ok(fs.statSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe')).isFile());
 assert.ok(fs.statSync('node_modules/wrangler/bin/wrangler.js').isFile());
 return {status:'LOCAL_RUNTIME_READY',dockerVersion:version.Server.Version,images:6,postgresVersion:'17.11',nodeVersion:process.version,dbConnections:0,providerCalls:0,imagePulls:0,containersStarted:0};
}
