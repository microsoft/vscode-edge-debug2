
/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';

import { ChromeDebugAdapter } from './chromeDebugAdapter';
import { ITelemetryPropertyCollector, utils as coreUtils } from 'vscode-chrome-debug-core';
import { ILaunchRequestArgs } from './chromeDebugInterfaces';
import * as errors from './errors';

export class EdgeChromiumDebugAdapter extends ChromeDebugAdapter {
    private _isDebuggerUsingWebView: boolean;

    public async launch(args: ILaunchRequestArgs, telemetryPropertyCollector: ITelemetryPropertyCollector, seq?: number) {
        let attachToWebView = false;

        if (args.useWebView) {
            if (!args.runtimeExecutable) {
                // Users must specify the host application via runtimeExecutable when using webview
                return errors.incorrectFlagMessage('runtimeExecutable', 'Must be set when using \'useWebView\'');
            }

            telemetryPropertyCollector.addTelemetryProperty('useWebView', 'true');
            this._isDebuggerUsingWebView = true;

            // Initialize WebView debugging environment variables
            args.port = args.port || 2015;
            if (!args.userDataDir) {
                args.userDataDir = path.join(os.tmpdir(), `vscode-edge-debug-userdatadir_${args.port}`);
            }
            args.env = args.env || {};
            args.env['WEBVIEW2_USER_DATA_FOLDER'] = args.userDataDir.toString();
            args.env['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = `--remote-debugging-port=${args.port}`;
            args.env['WEBVIEW2_WAIT_FOR_SCRIPT_DEBUGGER'] = `true`;

            // To ensure the ChromeDebugAdapter does not override the launchUrl for WebView we force noDebug=true.
            attachToWebView = !args.noDebug;
            args.noDebug = true;
        }

        await super.launch(args, telemetryPropertyCollector, seq);
        if (attachToWebView) {
            // If we are debugging a WebView, we need to attach to it after launch.
            // Since the ChromeDebugAdapter will have been called with noDebug=true,
            // it will not have auto attached during the super.launch() call.
            let launchUrl: string;
            if (args.file) {
                launchUrl = coreUtils.pathToFileURL(args.file);
            } else if (args.url) {
                launchUrl = args.url;
            }

            this.doAttach(args.port, launchUrl || args.urlFilter, args.address, args.timeout, undefined, args.extraCRDPChannelPort);
        }
    }

    protected async doAttach(port: number, targetUrl?: string, address?: string, timeout?: number, websocketUrl?: string, extraCRDPChannelPort?: number) {
        await super.doAttach(port, targetUrl, address, timeout, websocketUrl, extraCRDPChannelPort);

        if (this._isDebuggerUsingWebView) {
            // For WebViews we must issue the runIfWaitingForDebugger command once we are attached, to resume script execution
            this.chrome.Runtime.runIfWaitingForDebugger();
        }
    }

    protected runConnection(): Promise<void>[] {
        if (!this._isDebuggerUsingWebView) {
            return super.runConnection();
        } else {
            // For WebView we must no call super.runConnection() since that will cause the execution to resume before we are ready.
            // Instead we strip out the call to _chromeConnection.run() and call runIfWaitingForDebugger() once attach is complete.
            return [
                this.chrome.Console.enable()
                    .catch(e => { }),
                this.chrome.Debugger.enable() as any,
                this.chrome.Runtime.enable(),
                this.chrome.Log.enable()
                    .catch(e => { }),
                this.chrome.Page.enable(),
                this.chrome.Network.enable({}),
            ];
        }
    }
}
