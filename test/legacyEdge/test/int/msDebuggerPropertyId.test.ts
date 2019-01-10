/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { createServer } from 'http-server';

import * as ts from 'vscode-chrome-debug-core-testsupport';

import * as testSetup from './testSetup';
import * as assert from 'assert';
import { DebugProtocol } from 'vscode-debugprotocol/lib/debugProtocol';

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
            let scopes = await dc.scopesRequest({ frameId: st.body.stackFrames[0].id });
            let localsRef = scopes.body.scopes[0].variablesReference;
            let variables = await dc.variablesRequest({ variablesReference: localsRef });

            // Update the x variable on the local scope
            await dc.setVariableRequest({ variablesReference: localsRef, name: 'x', value: '999' });

            // Continue to end of function
            await dc.setBreakpointsRequest({ source: { path: scriptPath }, breakpoints: [{ line: bpLine2, column: bpCol2 }] });
            await dc.continueTo('breakpoint', { line: bpLine2, column: bpCol2 });
            st = await dc.stackTraceRequest();
            scopes = await dc.scopesRequest({ frameId: st.body.stackFrames[0].id });
            localsRef = scopes.body.scopes[0].variablesReference;
            variables = await dc.variablesRequest({ variablesReference: localsRef });

            // Ensure x is updated and ensure y was assigned the new value of x;
            let xChecked = false;
            let yChecked = false;
            for (const variable of variables.body.variables) {
                if (variable.name === 'x') {
                    assert.equal(variable.value, '999');
                    xChecked = true;
                } else if (variable.name === 'y') {
                    assert.equal(variable.value, '999');
                    yChecked = true;
                }
            }
            // Ensure x and y were checked
            assert.equal(xChecked, true, 'unable to confirm x was properly updated.');
            assert.equal(yChecked, true, 'unable to confirm y was properly updated.');

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
            let scopes = await dc.scopesRequest({ frameId: st.body.stackFrames[0].id });
            let localsRef = scopes.body.scopes[0].variablesReference;
            let variables = await dc.variablesRequest({ variablesReference: localsRef });

            // retrieve variableReference for 'obj'
            let objRef = findTargetVariableReference(variables.body.variables, 'obj');

            // Update obj.b
            await dc.setVariableRequest({ variablesReference: objRef, name: 'b', value: '999' });

            // Continue to end of function
            await dc.setBreakpointsRequest({ source: { path: scriptPath }, breakpoints: [{ line: bpLine2, column: bpCol2 }] });
            await dc.continueTo('breakpoint', { line: bpLine2, column: bpCol2 });
            st = await dc.stackTraceRequest();
            scopes = await dc.scopesRequest({ frameId: st.body.stackFrames[0].id });
            localsRef = scopes.body.scopes[0].variablesReference;
            variables = await dc.variablesRequest({ variablesReference: localsRef });

            // Retrieve new variableReference for 'obj', find ref for obj2
            objRef = findTargetVariableReference(variables.body.variables, 'obj');
            const objRef2 = findTargetVariableReference(variables.body.variables, 'obj2');

            // Ensure 'obj.b' is updated
            let objChecked = false;
            variables = await dc.variablesRequest({ variablesReference: objRef });
            for (const variable of variables.body.variables) {
                if (variable.name === 'b') {
                    assert.equal(variable.value, '999');
                    objChecked = true;
                    break;
                }
            }
            assert.equal(objChecked, true, 'unable to confirm obj.b was properly updated.');
            // Ensure 'obj2.b' is updated
            let obj2Checked = false;
            variables = await dc.variablesRequest({ variablesReference: objRef2 });
            for (const variable of variables.body.variables) {
                if (variable.name === 'b') {
                    assert.equal(variable.value, '999');
                    obj2Checked = true;
                    break;
                }
            }
            assert.equal(obj2Checked, true, 'unable to confirm obj2.b was properly updated.');
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
            let scopes = await dc.scopesRequest({ frameId: st.body.stackFrames[0].id });
            let localsRef = scopes.body.scopes[0].variablesReference;
            let variables = await dc.variablesRequest({ variablesReference: localsRef });

            // retrieve variableReference for 'obj'
            let objRef = findTargetVariableReference(variables.body.variables, 'obj');

            // update obj.accessorProp (getter property does not use msDebuggerPropertyId)
            await dc.setVariableRequest({ variablesReference: objRef, name: 'accessorProp', value: '123' });

            // Continue to end of function
            await dc.setBreakpointsRequest({ source: { path: scriptPath }, breakpoints: [{ line: bpLine2, column: bpCol2 }] });
            await dc.continueTo('breakpoint', { line: bpLine2, column: bpCol2 });
            st = await dc.stackTraceRequest();
            scopes = await dc.scopesRequest({ frameId: st.body.stackFrames[0].id });
            localsRef = scopes.body.scopes[0].variablesReference;
            variables = await dc.variablesRequest({ variablesReference: localsRef });

            // Retrieve new variableReference for 'obj'
            objRef = findTargetVariableReference(variables.body.variables, 'obj');
            const objRef2 = findTargetVariableReference(variables.body.variables, 'obj2');

            // Ensure 'obj.accessorProp' is updated
            let objChecked = false;
            variables = await dc.variablesRequest({ variablesReference: objRef });
            for (const variable of variables.body.variables) {
                if (variable.name === 'accessorProp') {
                    assert.equal(variable.value, '123');
                    objChecked = true;
                    break;
                }
            }
            assert.equal(objChecked, true, 'unable to confirm obj.accessorProp was properly updated.');
            // Ensure 'obj2.accessorProp' is updated
            let obj2Checked = false;
            variables = await dc.variablesRequest({ variablesReference: objRef });
            for (const variable of variables.body.variables) {
                if (variable.name === 'accessorProp') {
                    assert.equal(variable.value, '123');
                    obj2Checked = true;
                    break;
                }
            }
            assert.equal(obj2Checked, true, 'unable to confirm obj2.accessorProp was properly updated.');
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
