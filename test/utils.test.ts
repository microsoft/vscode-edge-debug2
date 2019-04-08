/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as mockery from 'mockery';
import * as assert from 'assert';
import * as path from 'path';
import * as testUtils from './testUtils';

/** Utils without mocks - use for type only */
import * as _Utils from '../src/utils';

const MODULE_UNDER_TEST = '../src/utils';
suite('Utils', () => {
    function getUtils(): typeof _Utils {
        return require(MODULE_UNDER_TEST);
    }

    setup(() => {
        testUtils.setupUnhandledRejectionListener();
        testUtils.registerLocMocks();

        mockery.enable({ useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false });
        mockery.registerMock('fs', { statSync: () => { }, existsSync: () => false });
    });

    teardown(() => {
        testUtils.removeUnhandledRejectionListener();

        mockery.deregisterAll();
        mockery.disable();
    });

    suite('getBrowserPath()', () => {
        test('user install beta', () => {
            // Overwrite the statSync mock to say the x86 path doesn't exist
            const statSync = (aPath: string) => {
                if (aPath.indexOf('(x86)') >= 0) throw new Error('Not found');
            };
            const existsSync = () => false;
            mockery.registerMock('fs', { statSync, existsSync });
            mockery.registerMock('os', { platform: () => 'win32' });

            const Utils = getUtils();
            assert.equal(
                Utils.getBrowserPath('beta'),
                path.join(process.env.LOCALAPPDATA, '\\Microsoft\\Edge Beta\\Application\\msedge.exe'));
        });

        test('system install beta', () => {
            mockery.registerMock('os', { platform: () => 'win32' });
            const Utils = getUtils();
            assert.equal(
                Utils.getBrowserPath('beta'),
                'C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe');
        });

        test('system install dev', () => {
            mockery.registerMock('os', { platform: () => 'win32' });
            const Utils = getUtils();
            assert.equal(
                Utils.getBrowserPath('dev'),
                'C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe');
        });

        test('system install canary', () => {
            mockery.registerMock('os', { platform: () => 'win32' });
            const Utils = getUtils();
            assert.equal(
                Utils.getBrowserPath('canary'),
                'C:\\Program Files (x86)\\Microsoft\\Edge SxS\\Application\\msedge.exe');
        });
    });

    suite('getTargetFilter()', () => {
        test('defaultTargetFilter', () => {
            const {defaultTargetFilter} = getUtils();
            const targets = [{type: 'page'}, {type: 'webview'}];
            assert.deepEqual(targets.filter(defaultTargetFilter), [{type: 'page'}]);
        });

        test('getTargetFilter', () => {
            const {getTargetFilter} = getUtils();
            const targets = [{type: 'page'}, {type: 'webview'}];
            assert.deepEqual(targets.filter(getTargetFilter(['page'])), [{type: 'page'}]);
            assert.deepEqual(targets.filter(getTargetFilter(['webview'])), [{type: 'webview'}]);
            assert.deepEqual(targets.filter(getTargetFilter(['page', 'webview'])), targets);
            // Falsy targetTypes should effectively disable filtering.
            assert.deepEqual(targets.filter(getTargetFilter()), targets);
        });
    });
});
