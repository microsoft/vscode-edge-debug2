/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as mockery from 'mockery';
import * as assert from 'assert';

import * as testUtils from './testUtils';

/** Utils without mocks - use for type only */
import * as _Utils from '../../../src/legacyEdge/utils';

const MODULE_UNDER_TEST = '../../../src/legacyEdge/utils';
suite('Utils', () => {
    function getUtils(): typeof _Utils {
        return require(MODULE_UNDER_TEST);
    }

    setup(() => {
        testUtils.setupUnhandledRejectionListener();

        mockery.enable({ useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false });
    });

    teardown(() => {
        testUtils.removeUnhandledRejectionListener();

        mockery.deregisterAll();
        mockery.disable();
    });

    suite('getBrowserPath()', () => {
        test('returns MicrosoftEdge', () => {
            const Utils = getUtils();
            assert.equal(Utils.getEdgePath(), 'MicrosoftEdge');
        });
    });

    suite('isEdgeDebuggingSupported()', () => {
        test('is not supported for non-Windows', () => {
            mockery.registerMock('os', { platform: () => 'linux', release: () => '10.0.20000' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), false);
        });

        test('is not supported for Windows unexpected release', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '10.unexpected' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), false);
        });

        test('is not supported for Windows before 10', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '6.0.20000' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), false);
        });

        test('is not supported for Windows 10 older build', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '10.0.17057' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), false);
        });

        test('is supported for Windows 10 RS4 build', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '10.0.17058' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), true);
        });

        test('is supported for Windows 10 higher than RS4 build', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '10.0.20000' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), true);
        });

        test('is supported for Windows higher minor version', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '10.1.1' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), true);
        });

        test('is supported for Windows higher major version', () => {
            mockery.registerMock('os', { platform: () => 'win32', release: () => '11.0.0' });
            const Utils = getUtils();
            assert.equal(Utils.isEdgeDebuggingSupported(), true);
        });
    });
});