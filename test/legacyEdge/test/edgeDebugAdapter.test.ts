/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/// <reference path="../../../node_modules/@types/mocha/index.d.ts" />
import { DebugProtocol } from 'vscode-debugprotocol';
import { chromeConnection, ISourceMapPathOverrides, Version, TargetVersions } from 'vscode-chrome-debug-core';

import * as mockery from 'mockery';
import { EventEmitter } from 'events';
import * as assert from 'assert';
import * as path from 'path';
import { Mock, IMock, MockBehavior, It } from 'typemoq';

import { getMockEdgeConnectionApi, IMockEdgeConnectionAPI } from './debugProtocolMocks';
import * as testUtils from './testUtils';

/** Not mocked - use for type only */
import { EdgeDebugAdapter as _EdgeDebugAdapter } from '../../../src/legacyEdge/edgeDebugAdapter';
import { StepProgressEventsEmitter } from 'vscode-chrome-debug-core/out/src/executionTimingsReporter';

class MockEdgeDebugSession {
    public sendEvent(event: DebugProtocol.Event): void {
    }

    public sendRequest(command: string, args: any, timeout: number, cb: (response: DebugProtocol.Response) => void): void {
    }
}

const MODULE_UNDER_TEST = '../../../src/legacyEdge/edgeDebugAdapter';
suite('EdgeDebugAdapter', () => {
    let mockEdgeConnection: IMock<chromeConnection.ChromeConnection>;
    let mockEventEmitter: EventEmitter;
    let mockEdge: IMockEdgeConnectionAPI;

    let edgeDebugAdapter: _EdgeDebugAdapter;
    let isAttached = false;
    setup(() => {
        testUtils.setupUnhandledRejectionListener();
        mockery.enable({ useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false });

        // Create a ChromeConnection mock with .on and .attach. Tests can fire events via mockEventEmitter
        mockEdgeConnection = Mock.ofType(chromeConnection.ChromeConnection);
        mockEdge = getMockEdgeConnectionApi();
        mockEventEmitter = mockEdge.mockEventEmitter;
        mockEdgeConnection
            .setup(x => x.api)
            .returns(() => mockEdge.apiObjects);
        mockEdgeConnection
            .setup(x => x.isAttached)
            .returns(() => isAttached);
        mockEdgeConnection
            .setup(x => x.attachedTarget)
            .returns(() => ({ description: '', devtoolsFrontendUrl: '', id: '', title: '', type: '', webSocketDebuggerUrl: '', version: Promise.resolve(new TargetVersions(Version.unknownVersion(), Version.unknownVersion())) }));
        mockEdgeConnection
            .setup(x => x.run())
            .returns(() => Promise.resolve());
        mockEdgeConnection
            .setup(x => x.onClose(It.isAny()));
        mockEdgeConnection
            .setup(x => x.events)
            .returns(x => new StepProgressEventsEmitter());
        mockEdgeConnection
            .setup(x => x.version)
            .returns(() => Promise.resolve(new TargetVersions(Version.unknownVersion(), Version.unknownVersion())));

        // Instantiate the EdgeDebugAdapter, injecting the mock EdgeConnection
        const cDAClass: typeof _EdgeDebugAdapter = require(MODULE_UNDER_TEST).EdgeDebugAdapter;
        edgeDebugAdapter = new cDAClass({ chromeConnection: function() {
            return mockEdgeConnection.object; } } as any, new MockEdgeDebugSession() as any);
    });

    teardown(() => {
        testUtils.removeUnhandledRejectionListener();
        mockery.deregisterAll();
        mockery.disable();
        mockEdgeConnection.verifyAll();
    });

    suite('launch()', () => {
        let originalFork: any;
        let originalSpawn: any;
        let originalStatSync: any;

        teardown(() => {
            // Hacky mock cleanup
            require('child_process').fork = originalFork;
            require('fs').statSync = originalStatSync;
        });

        test('launches with minimal correct args', () => {
            let spawnCalled = false;
            function fork(edgeSpawnHelperPath: string, [edgePath, ...args]: string[]): any {
                assert(edgeSpawnHelperPath.indexOf('edgeSpawnHelper.js') >= 0);
                return spawn(edgePath, args);
            }

            function spawn(edgePath: string, args: string[]): any {
                assert(edgePath.toLowerCase().indexOf('microsoftedge') >= 0);
                assert(args.indexOf('--devtools-server-port') >= 0);
                assert(args.indexOf('2015') >= 0);
                // We should initially launch with landing page
                let landingPagePath = path.dirname(path.dirname(path.dirname(path.dirname(__dirname))));
                assert(args.indexOf(encodeURI('file:///' + landingPagePath + '/landingPage.html')) >= 0);
                spawnCalled = true;

                const stdio = { on: () => { } };
                return { on: () => { }, unref: () => { }, stdout: stdio, stderr: stdio };
            }

            // Mock fork/spawn for edge process, and 'fs' for finding MicrosoftEdge.
            // These are mocked as empty above - note that it's too late for mockery here.
            originalFork = require('child_process').fork;
            originalSpawn = require('child_process').spawn;
            require('child_process').fork = fork;
            require('child_process').spawn = spawn;
            originalStatSync = require('fs').statSync;
            require('fs').statSync = () => true;

            mockEdgeConnection
                .setup(x => x.attach(It.isValue(undefined), It.isAnyNumber(), It.isAnyString(), It.isValue(undefined), It.isValue(undefined)))
                .returns(() => {
                    isAttached = true;
                    return Promise.resolve();
                })
                .verifiable();

            mockEdge.Runtime
                .setup(x => x.evaluate(It.isAny()))
                .returns(() => Promise.resolve<any>({ result: { type: 'string', value: '123' }}));

            return edgeDebugAdapter.launch({ file: 'c:\\path with space\\index.html' })
                .then(() => assert(spawnCalled));
        });
    });

    suite('evaluate()', () => {
        let frameHandle_beforeOverride;
        let chromeDebuggerEvaluateOnCallFrame_beforeOverride;
        let remoteObjectToVariable_beforeOverride;

        teardown(() => {
            // also hacky cleanup...
            (<any>edgeDebugAdapter)._frameHandles = frameHandle_beforeOverride;
            (<any>edgeDebugAdapter).chrome.Debugger = chromeDebuggerEvaluateOnCallFrame_beforeOverride;
            (<any>edgeDebugAdapter).remoteObjectToVariable = remoteObjectToVariable_beforeOverride;
        });

        test('returns error when watch variable is missing', () => {
            let callFrameId: number = 1;
            let evalArgs: DebugProtocol.EvaluateArguments = {expression: 'zzz', frameId: callFrameId, context: 'watch'};

            // save originals
            frameHandle_beforeOverride = (<any>edgeDebugAdapter)._frameHandles;
            chromeDebuggerEvaluateOnCallFrame_beforeOverride = (<any>edgeDebugAdapter).chrome.Debugger;
            remoteObjectToVariable_beforeOverride = (<any>edgeDebugAdapter).remoteObjectToVariable;

            (<any>edgeDebugAdapter)._frameHandles = { get: () => ({ callFrameId })};
            (<any>edgeDebugAdapter).chrome.Debugger = {evaluateOnCallFrame: () => ({ type: 'Object', subtype: 'error', result: ''})};
            (<any>edgeDebugAdapter).remoteObjectToVariable = () => ({ type: 'Object', value: '', variablesReference: undefined, indexedVariables: undefined});

            return edgeDebugAdapter.evaluate(evalArgs).then(
                () => Promise.reject(new Error('Expected method to reject')),
                (err) => {assert.equal(err.message, 'not available', 'Error should contain \'not available\' message.'); }
            );
        });

    });

    suite('resolveWebRootPattern', () => {
        const WEBROOT = testUtils.pathResolve('/project/webroot');
        const resolveWebRootPattern = require(MODULE_UNDER_TEST).resolveWebRootPattern;

        test('does nothing when no ${webRoot} present', () => {
            const overrides: ISourceMapPathOverrides = { '/src': '/project' };
            assert.deepEqual(
                resolveWebRootPattern(WEBROOT, overrides),
                overrides);
        });

        test('resolves the webRoot pattern', () => {
            assert.deepEqual(
                resolveWebRootPattern(WEBROOT, <ISourceMapPathOverrides>{ '/src': '${webRoot}/app/src'}),
                { '/src': WEBROOT + '/app/src' });
            assert.deepEqual(
                resolveWebRootPattern(WEBROOT, <ISourceMapPathOverrides>{ '${webRoot}/src': '${webRoot}/app/src'}),
                { [WEBROOT + '/src']:  WEBROOT + '/app/src'});
        });

        test(`ignores the webRoot pattern when it's not at the beginning of the string`, () => {
            const overrides: ISourceMapPathOverrides = { '/another/${webRoot}/src': '/app/${webRoot}/src'};
            assert.deepEqual(
                resolveWebRootPattern(WEBROOT, overrides),
                overrides);
        });

        test('works on a set of overrides', () => {
            const overrides: ISourceMapPathOverrides = {
                '/src*': '${webRoot}/app',
                '*/app.js': '*/app.js',
                '/src/app.js': '/src/${webRoot}',
                '/app.js': '${webRoot}/app.js',
                '${webRoot}/app1.js': '${webRoot}/app.js'
            };

            const expOverrides: ISourceMapPathOverrides = {
                '/src*': WEBROOT + '/app',
                '*/app.js': '*/app.js',
                '/src/app.js': '/src/${webRoot}',
                '/app.js': WEBROOT + '/app.js',
                [WEBROOT + '/app1.js']: WEBROOT + '/app.js'
            };

            assert.deepEqual(
                resolveWebRootPattern(WEBROOT, overrides),
                expOverrides);
        });
    });
});
