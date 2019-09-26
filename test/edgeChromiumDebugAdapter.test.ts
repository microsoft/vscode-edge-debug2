/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as assert from 'assert';
import { EventEmitter } from 'events';
import * as mockery from 'mockery';
import { chromeConnection, ISourceMapPathOverrides, telemetry, TargetVersions, Version } from 'vscode-chrome-debug-core';
import { EdgeChromiumDebugAdapter as _EdgeChromiumDebugAdapter } from '../src/edgeChromiumDebugAdapter';
import * as testUtils from './testUtils';



const MODULE_UNDER_TEST = '../src/edgeChromiumDebugAdapter';
suite('EdgeChromiumDebugAdapter', () => {
    let edgeChromiumDebugAdapter: _EdgeChromiumDebugAdapter;
    let mockLaunch: (args: any) => void;
    let mockDoAttach: () => void;
    let mockRun: () => void;

    setup(() => {
        testUtils.setupUnhandledRejectionListener();
        testUtils.registerLocMocks();
        mockery.enable({ useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false });

        mockLaunch = () => { };
        mockDoAttach = () => { };
        mockRun = () => { };

        mockery.registerMock('./chromeDebugAdapter', {
            ChromeDebugAdapter: class ChromeDebugAdapter {
                protected chrome: any;
                constructor() {
                    this.chrome = { Runtime: { runIfWaitingForDebugger: () => { mockRun(); } } }
                }
                launch(a) { mockLaunch(a); }
                doAttach() { mockDoAttach(); }
            }
        });

        // Instantiate the ChromeDebugAdapter, injecting the mock ChromeConnection
        const eCDAClass: typeof _EdgeChromiumDebugAdapter = require(MODULE_UNDER_TEST).EdgeChromiumDebugAdapter;
        edgeChromiumDebugAdapter = new eCDAClass(null, null);
    });

    teardown(() => {
        testUtils.removeUnhandledRejectionListener();
        mockery.deregisterAll();
        mockery.disable();
    });

    suite('launch()', () => {
        let launchCount: number;
        let launchArgs: any;
        let attachCount: number;
        let runCount: number;

        setup(() => {
            launchCount = 0;
            launchArgs = {};
            attachCount = 0;
            runCount = 0;

            mockLaunch = (args: any) => {
                launchArgs = args;
                launchCount++;
            };
            mockDoAttach = () => {
                attachCount++;
            };
            mockRun = () => {
                runCount++;
            };
        });

        teardown(() => {
        });

        test('launches with webview', async () => {
            await edgeChromiumDebugAdapter.launch({
                runtimeExecutable: 'webview.exe',
                useWebView: true,
            }, new telemetry.TelemetryPropertyCollector());

            assert(launchCount === 1);
            assert(launchArgs.noDebug);
            assert(launchArgs.env['WEBVIEW2_USER_DATA_FOLDER']);
            assert(launchArgs.env['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS']);
            assert(launchArgs.env['WEBVIEW2_WAIT_FOR_SCRIPT_DEBUGGER']);
            assert(attachCount === 1);
            assert(runCount === 1);
        });

        test('launches without webview', async () => {
            await edgeChromiumDebugAdapter.launch({
            }, new telemetry.TelemetryPropertyCollector());

            assert(launchCount === 1);
            assert(launchArgs.env === undefined);
            assert(attachCount === 0);
            assert(runCount === 0);
        });
    });
});
