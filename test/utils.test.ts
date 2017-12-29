/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as mockery from 'mockery';
import * as assert from 'assert';

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

        mockery.enable({ useCleanCache: true, warnOnReplace: false, warnOnUnregistered: false });
        mockery.registerMock('fs', { statSync: () => { }, existsSync: () => false });
    });

    teardown(() => {
        testUtils.removeUnhandledRejectionListener();

        mockery.deregisterAll();
        mockery.disable();
    });

    suite('getEdgePath()', () => {
        test('win', () => {
            // Overwrite the statSync mock to say the x86 path doesn't exist
            const statSync = (aPath: string) => {
                if (aPath.indexOf('(x86)') >= 0) throw new Error('Not found');
            };
            const existsSync = () => false;
            mockery.registerMock('fs', { statSync, existsSync });
            mockery.registerMock('os', { platform: () => 'win32' });

            const Utils = getUtils();
            assert.equal(
                Utils.getEdgePath(),
                'MicrosoftEdge');
        });

        test('winx86', () => {
            mockery.registerMock('os', { platform: () => 'win32' });
            const Utils = getUtils();
            assert.equal(
                Utils.getEdgePath(),
                'MicrosoftEdge');
        });
    });
});