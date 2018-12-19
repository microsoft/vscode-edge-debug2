/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as path from 'path';
import { utils as coreUtils, chromeConnection } from 'vscode-chrome-debug-core';

const WIN_APPDATA = process.env.LOCALAPPDATA || '/';

const MSEDGE_BETA_VERSION = 'beta';
const MSEDGE_DEV_VERSION = 'dev';
const MSEDGE_CANARY_VERSION = 'canary';

interface IMSEdgeVersionPaths {
    WINx86_SYSTEMPATH: string;
    WINx86_USERPATH: string;
}

const MSEDGE_BETA_PATHS: IMSEdgeVersionPaths = {
    WINx86_SYSTEMPATH: 'C:\\Program Files (x86)\\Microsoft\\Edge Beta\\Application\\msedge.exe',
    WINx86_USERPATH: path.join(WIN_APPDATA, 'Microsoft\\Edge Beta\\Application\\msedge.exe')
}

const MSEDGE_DEV_PATHS: IMSEdgeVersionPaths = {
    WINx86_SYSTEMPATH: 'C:\\Program Files (x86)\\Microsoft\\Edge Dev\\Application\\msedge.exe',
    WINx86_USERPATH: path.join(WIN_APPDATA, 'Microsoft\\Edge Dev\\Application\\msedge.exe')
};

const MSEDGE_CANARY_PATHS: IMSEdgeVersionPaths = {
    WINx86_SYSTEMPATH: 'C:\\Program Files (x86)\\Microsoft\\Edge SxS\\Application\\msedge.exe',
    WINx86_USERPATH: path.join(WIN_APPDATA, 'Microsoft\\Edge SxS\\Application\\msedge.exe')
}

export function getBrowserPath(msedgeVersion: string): string {
    const platform = coreUtils.getPlatform();
    if (platform === coreUtils.Platform.Windows) {
        let possiblePaths: IMSEdgeVersionPaths;
        switch (msedgeVersion) {
            case MSEDGE_BETA_VERSION: {
                possiblePaths = MSEDGE_BETA_PATHS;
                break;
            }
            case MSEDGE_DEV_VERSION: {
                possiblePaths = MSEDGE_DEV_PATHS;
                break;
            }
            case MSEDGE_CANARY_VERSION: {
                possiblePaths = MSEDGE_CANARY_PATHS;
                break;
            }
            default: {
                return null
            }
        }
        return getExecutable(possiblePaths);
    } else {
        return null;
    }
}

function getExecutable(possiblePaths: IMSEdgeVersionPaths) {
    if (coreUtils.existsSync(possiblePaths.WINx86_SYSTEMPATH)) {
        return possiblePaths.WINx86_SYSTEMPATH;
    } else if (coreUtils.existsSync(possiblePaths.WINx86_USERPATH)) {
        return possiblePaths.WINx86_USERPATH;
    } else {
        return null;
    }
}

export class DebounceHelper {
    private waitToken: any; // TS can't decide whether Timer or number...

    constructor(private timeoutMs: number) { }

    /**
     * If not waiting already, call fn after the timeout
     */
    public wait(fn: () => any): void {
        if (!this.waitToken) {
            this.waitToken = setTimeout(() => {
                this.waitToken = null;
                fn();
            },
                this.timeoutMs);
        }
    }

    /**
     * If waiting for something, cancel it and call fn immediately
     */
    public doAndCancel(fn: () => any): void {
        if (this.waitToken) {
            clearTimeout(this.waitToken);
            this.waitToken = null;
        }

        fn();
    }
}

export const getTargetFilter = (targetTypes?: string[]): chromeConnection.ITargetFilter => {
    if (targetTypes) {
        return target => target && (!target.type || targetTypes.indexOf(target.type) !== -1);
    }

    return () => true;
};

export const defaultTargetFilter = getTargetFilter(['page']);
