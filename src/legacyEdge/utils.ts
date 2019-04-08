/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import { utils as coreUtils, chromeConnection } from 'vscode-chrome-debug-core';

export function isEdgeDebuggingSupported(): boolean {
    if (os.platform() !== 'win32') {
        return false;
    }

    const versionPieces = os.release().split('.');
    const majorVersion = +versionPieces[0];
    const minorVersion = +versionPieces[1];
    const buildNumber = +versionPieces[2];

    return (majorVersion > 10) ||
        (majorVersion === 10 && minorVersion > 0) ||
        (majorVersion === 10 && minorVersion === 0 && buildNumber >= 17058); // RS4 or higher
}

export function getEdgePath(): string {
    return 'MicrosoftEdge';
}

export const targetFilter: chromeConnection.ITargetFilter =
    target => target && (!target.type || target.type === 'page' || target.type === 'Page');
