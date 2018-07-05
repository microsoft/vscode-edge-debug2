/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { logger } from 'vscode-debugadapter';
import * as url from 'url';
import {utils as coreUtils, chromeConnection} from 'vscode-chrome-debug-core';

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

/**
 * Helper function to GET the contents of a url
 */
export function getURL(aUrl: string, options: https.RequestOptions = {}): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(aUrl);
        const get = parsedUrl.protocol === 'https:' ? https.get : http.get;
        options = <https.RequestOptions>{
            rejectUnauthorized: false,
            ...parsedUrl,
            ...options
        };

        get(options, response => {
            let responseData = '';
            response.on('data', chunk => responseData += chunk);
            response.on('end', () => {
                // Sometimes the 'error' event is not fired. Double check here.
                if (response.statusCode === 200) {
                    resolve(responseData);
                } else {
                    logger.log('HTTP GET failed with: ' + response.statusCode.toString() + ' ' + response.statusMessage.toString());
                    reject(new Error(responseData.trim()));
                }
            });
        }).on('error', e => {
            logger.log('HTTP GET failed: ' + e.toString());
            reject(e);
        });
    });
}
