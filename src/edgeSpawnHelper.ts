/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as cp from 'child_process';

const edgePath = process.argv[2];
const edgeArgs = process.argv.slice(3);

console.log(`spawn('${edgePath}', ${JSON.stringify(edgeArgs) })`);
const edgeProc = cp.spawn(edgePath, edgeArgs, {
    stdio: 'ignore',
    detached: true
});

edgeProc.unref();
process.send(edgeProc.pid);
