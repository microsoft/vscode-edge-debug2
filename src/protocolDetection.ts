'use strict';

import { Logger } from 'vscode-debugadapter';
import { utils, telemetry } from 'vscode-chrome-debug-core';

export class ProtocolDetection {
    private logger: Logger.ILogger;

    constructor(_logger: Logger.ILogger) {
        this.logger = _logger;
    }

    public async hitVersionEndpoint(address: string, port: number): Promise<string> {
        const url = `http://${address}:${port}/json/version`;
        this.logger.log(`Getting browser and debug protocol version via ${url}`);

        const jsonResponse = await utils.getURL(url, { headers: { Host: 'localhost' } })
            .catch(e => {
                // This means /json/version is not available.
                this.logger.log(`There was an error connecting to ${url} : ${e.message}`);
                throw e;
            });

        return JSON.parse(jsonResponse);
    }

    public extractBrowserProtocol(detectedBrowserJsonVersion: any): string {
        if (!detectedBrowserJsonVersion || !detectedBrowserJsonVersion.Browser) {
            return null;
        }

        const browserProtocol = detectedBrowserJsonVersion.Browser as string;
        this.logger.log(`Got debug protocol version: ${browserProtocol}`);

        return browserProtocol;
    }
}