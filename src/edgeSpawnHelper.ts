/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as cp from 'child_process';
import { createInterface } from 'readline';

const edgePath = process.argv[2];
const edgeArgs = process.argv.slice(3);

console.log(`spawn('${edgePath}', ${JSON.stringify(edgeArgs) })`);
const edgeProc = cp.spawn(edgePath, edgeArgs, {
    stdio: 'ignore',
    detached: true
});

edgeProc.unref();
if (!edgeProc.pid) {
    process.send(<ISpawnHelperResult>{"error": "Cannot get process id"});
} else {
    process.send(<ISpawnHelperResult>{"error": null});
}

export interface ISpawnHelperResult {
    error: string | null
}
