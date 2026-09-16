import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {guard, save, ROOT, json} from './common.mjs';

const authorized = guard();
if (fs.existsSync(ROOT + '/runtime') || Date.now() >= json(ROOT+'/control/allocation-claimed.json').freshDeadlineAt) {
  throw Error('START_REJECTED');
}
save('client-start-claimed.json', {at: Date.now(), singleProcess: true, runAllowance: 1});
