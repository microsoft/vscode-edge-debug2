/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import {createServer} from 'http-server';

import * as ts from 'vscode-chrome-debug-core-testsupport';

import * as testSetup from './testSetup';
import * as assert from 'assert';
import { DebugProtocol } from '../../node_modules/vscode-debugadapter/node_modules/vscode-debugprotocol/lib/debugProtocol';

suite('msDebuggerPropertyId', () => {
    const DATA_ROOT = testSetup.DATA_ROOT;

    let dc: ts.ExtendedDebugClient;
    setup(() => {
        return testSetup.setup()
            .then(_dc => dc = _dc);
    });

    let server: any;
    teardown(() => {
        if (server) {
            server.close();
        }

        return testSetup.teardown();
    });

    suite('Test setting variable values:', () => {
        test('Test updating local scope variable using Debugger.setVariableValue.', async () => {
            const testProjectRoot = path.join(DATA_ROOT, 'msDebuggerPropertyId');
            const scriptPath = path.join(testProjectRoot, 'src/script.ts');

            server = createServer({ root: testProjectRoot });
            server.listen(7890);

            const url = 'http://localhost:7890/index.html';

            const bpLine = 9;
            const bpCol = 5;
            const bpLine2 = 11;
            const bpCol2 = 1;

            // Hit the first breakpoint
            await dc.hitBreakpointUnverified({ url, webRoot: testProjectRoot }, { path: scriptPath, line: bpLine, column: bpCol });

            // Retrieve the variableReference for the Local scope
            let st = await dc.stackTraceRequest();
            let scopes = await dc.scopesRequest({frameId: st.body.stackFrames[0].id});
            let localsRef = scopes.body.scopes[0].variablesReference;
            let variables = await dc.variablesRequest({variablesReference: localsRef });

            // Update the x variable on the local scope
            await dc.setVariableRequest({variablesReference: localsRef, name: 'x', value: '999'});

            // Continue to end of function
            await dc.setBreakpointsRequest({ source: { path: scriptPath }, breakpoints: [{ line: bpLine2, column: bpCol2 }] });
            await dc.continueTo('breakpoint', { line: bpLine2, column: bpCol2 });
            st = await dc.stackTraceRequest();
            scopes = await dc.scopesRequest({frameId: st.body.stackFrames[0].id});
            localsRef = scopes.body.scopes[0].variablesReference;
            variables = await dc.variablesRequest({variablesReference: localsRef });

            // Ensure x is updated
            for (const variable of variables.body.variables) {
                if (variable.name === 'x') {
                    assert.equal(variable.value, '999');
                    break;
                }
            }
        });

        test('Test updating object scope variable using Debugger.msSetDebuggerPropertyId.', async () => {
            const testProjectRoot = path.join(DATA_ROOT, 'msDebuggerPropertyId');
            const scriptPath = path.join(testProjectRoot, 'src/script.ts');

            server = createServer({ root: testProjectRoot });
            server.listen(7890);

            const url = 'http://localhost:7890/index.html';

            const bpLine = 9;
            const bpCol = 5;
            const bpLine2 = 11;
            const bpCol2 = 1;

            // Hit the first breakpoint
            await dc.hitBreakpointUnverified({ url, webRoot: testProjectRoot }, { path: scriptPath, line: bpLine, column: bpCol });

            // Retrieve the variableReference for the Local scope
            let st = await dc.stackTraceRequest();
            let scopes = await dc.scopesRequest({frameId: st.body.stackFrames[0].id});
            let localsRef = scopes.body.scopes[0].variablesReference;
            let variables = await dc.variablesRequest({variablesReference: localsRef });

            // retrieve variableReference for 'obj'
            let objRef = findTargetVariableReference(variables.body.variables, 'obj');

            // Update obj.b
            await dc.setVariableRequest({variablesReference: objRef, name: 'b', value: '999'});

            // Continue to end of function
            await dc.setBreakpointsRequest({ source: { path: scriptPath }, breakpoints: [{ line: bpLine2, column: bpCol2 }] });
            await dc.continueTo('breakpoint', { line: bpLine2, column: bpCol2 });
            st = await dc.stackTraceRequest();
            scopes = await dc.scopesRequest({frameId: st.body.stackFrames[0].id});
            localsRef = scopes.body.scopes[0].variablesReference;
            variables = await dc.variablesRequest({variablesReference: localsRef });

            // Retrieve new variableReference for 'obj'
            objRef = findTargetVariableReference(variables.body.variables, 'obj');

            // Ensure 'obj.b' is updated
            variables = await dc.variablesRequest({variablesReference: objRef });
            for (const variable of variables.body.variables) {
                if(variable.name === 'b') {
                    assert.equal(variable.value, '999');
                    break;
                }
            }
        });

        test('Test updating object scope accessor Property using Runtime.callFunctionOn.', async () => {
            const testProjectRoot = path.join(DATA_ROOT, 'msDebuggerPropertyId');
            const scriptPath = path.join(testProjectRoot, 'src/script.ts');

            server = createServer({ root: testProjectRoot });
            server.listen(7890);

            const url = 'http://localhost:7890/index.html';

            const bpLine = 9;
            const bpCol = 5;
            const bpLine2 = 11;
            const bpCol2 = 1;

            // Hit the first breakpoint
            await dc.hitBreakpointUnverified({ url, webRoot: testProjectRoot }, { path: scriptPath, line: bpLine, column: bpCol });

            // Retrieve the variableReference for the Local scope
            let st = await dc.stackTraceRequest();
            let scopes = await dc.scopesRequest({frameId: st.body.stackFrames[0].id});
            let localsRef = scopes.body.scopes[0].variablesReference;
            let variables = await dc.variablesRequest({variablesReference: localsRef });

            // retrieve variableReference for 'obj'
            let objRef = findTargetVariableReference(variables.body.variables, 'obj');

            // update obj.accessorProp (getter property does not use msDebuggerPropertyId)
            await dc.setVariableRequest({variablesReference: objRef, name: 'accessorProp', value: '123'});

            // Continue to end of function
            await dc.setBreakpointsRequest({ source: { path: scriptPath }, breakpoints: [{ line: bpLine2, column: bpCol2 }] });
            await dc.continueTo('breakpoint', { line: bpLine2, column: bpCol2 });
            st = await dc.stackTraceRequest();
            scopes = await dc.scopesRequest({frameId: st.body.stackFrames[0].id});
            localsRef = scopes.body.scopes[0].variablesReference;
            variables = await dc.variablesRequest({variablesReference: localsRef });

            // Retrieve new variableReference for 'obj'
            objRef = findTargetVariableReference(variables.body.variables, 'obj');

            // Ensure 'obj.accessorProp' is updated
            variables = await dc.variablesRequest({variablesReference: objRef });
            for (const variable of variables.body.variables) {
                if (variable.name === 'accessorProp') {
                    assert.equal(variable.value, '123');
                    break;
                }
            }
        });
    });
});

function findTargetVariableReference(variables: DebugProtocol.Variable[], variableName: String): number | undefined {
    for (const variable of variables) {
        if (variable.name === variableName) {
            return variable.variablesReference;
        }
    }
}
