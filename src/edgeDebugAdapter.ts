/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import {ChromeDebugAdapter as CoreDebugAdapter, logger, utils as coreUtils, ISourceMapPathOverrides} from 'vscode-chrome-debug-core';
import {spawn, ChildProcess, fork, execSync} from 'child_process';
import {Crdp} from 'vscode-chrome-debug-core';
import {DebugProtocol} from 'vscode-debugprotocol';

import {ILaunchRequestArgs, IAttachRequestArgs, ICommonRequestArgs} from './edgeDebugInterfaces';
import * as utils from './utils';
import * as errors from './errors';

import * as nls from 'vscode-nls';
const localize = nls.config(process.env.VSCODE_NLS_CONFIG)();

const DefaultWebSourceMapPathOverrides: ISourceMapPathOverrides = {
    'webpack:///./~/*': '${webRoot}/node_modules/*',
    'webpack:///./*': '${webRoot}/*',
    'webpack:///*': '*',
    'webpack:///src/*': '${webRoot}/*',
    'meteor://💻app/*': '${webRoot}/*'
};

export class EdgeDebugAdapter extends CoreDebugAdapter {
    private static PAGE_PAUSE_MESSAGE = 'Paused in Visual Studio Code';

    private _edgeProc: ChildProcess;
    private _edgePID: number;
    private _breakOnLoadActive = false;
    private _userRequestedUrl: string;

    public initialize(args: DebugProtocol.InitializeRequestArguments): DebugProtocol.Capabilities {
        const capabilities = super.initialize(args);
        capabilities.supportsRestartRequest = true;

        return capabilities;
    }

    public launch(args: ILaunchRequestArgs): Promise<void> {
        return super.launch(args).then(() => {
            let runtimeExecutable: string;
            if (args.runtimeExecutable) {
                const re = findExecutable(args.runtimeExecutable);
                if (!re) {
                    return errors.getNotExistErrorResponse('runtimeExecutable', args.runtimeExecutable);
                }

                runtimeExecutable = re;
            }

            runtimeExecutable = runtimeExecutable || utils.getEdgePath();
            if (!runtimeExecutable) {
                return coreUtils.errP(localize('attribute.edge.missing', "Can't find Edge - install it or set the \"runtimeExecutable\" field in the launch config."));
            }

            // Start with remote debugging enabled
            const port = args.port || 9222;
            const edgeArgs: string[] = [];
            const edgeEnv: {[key: string]: string} = args.env || null;
            const edgeWorkingDir: string = args.cwd || null;

            if (!args.noDebug) {
                edgeArgs.push('--devtools-server-port ' + port);
            }

            let launchUrl: string;
            if (args.file) {
                launchUrl = coreUtils.pathToFileURL(args.file);
            } else if (args.url) {
                launchUrl = args.url;
            }
            edgeArgs.push(launchUrl);
            /*if (launchUrl) {
                if (args.breakOnLoadStrategy !== 'none') {
                    // We store the launch file/url provided and temporarily launch and attach to about:blank page. Once we receive configurationDone() event, we redirect the page to this file/url
                    // This is done to facilitate hitting breakpoints on load
                    this._userRequestedUrl = launchUrl;
                    launchUrl = "about:blank";
                    this._breakOnLoadActive = true;
                }

                edgeArgs.push(launchUrl);
            }*/

            this._edgeProc = this.spawnEdge(runtimeExecutable, edgeArgs, edgeEnv, edgeWorkingDir, !!args.runtimeExecutable);
            this._edgeProc.on('error', (err) => {
                const errMsg = 'Chrome error: ' + err;
                logger.error(errMsg);
                this.terminateSession(errMsg);
            });

            return args.noDebug ? undefined :
                this.doAttach(port, launchUrl || args.urlFilter, args.address, args.timeout, undefined, args.extraCRDPChannelPort);
        });
    }

    public attach(args: IAttachRequestArgs): Promise<void> {
        if (args.urlFilter) {
            args.url = args.urlFilter;
        }

        return super.attach(args);
    }

    public configurationDone(): Promise<void> {
        if (this._breakOnLoadActive) {
            // This means all the setBreakpoints requests have been completed. So we can navigate to the original file/url.
            this.chrome.Page.navigate({url: this._userRequestedUrl});
        }
        return super.configurationDone();
    }

    public commonArgs(args: ICommonRequestArgs): void {
        if (!args.webRoot && args.pathMapping && args.pathMapping['/']) {
            // Adapt pathMapping['/'] as the webRoot when not set, since webRoot is explicitly used in many places
            args.webRoot = args.pathMapping['/'];
        }

        args.sourceMaps = typeof args.sourceMaps === 'undefined' || args.sourceMaps;
        args.sourceMapPathOverrides = getSourceMapPathOverrides(args.webRoot, args.sourceMapPathOverrides);
        args.skipFileRegExps = ['^chrome-extension:.*'];

        super.commonArgs(args);
    }

    protected doAttach(port: number, targetUrl?: string, address?: string, timeout?: number, websocketUrl?: string, extraCRDPChannelPort?: number): Promise<void> {
        return super.doAttach(port, targetUrl, address, timeout, websocketUrl, extraCRDPChannelPort).then(() => {
            // Don't return this promise, a failure shouldn't fail attach
            this.globalEvaluate({ expression: 'navigator.userAgent', silent: true })
                .then(
                    evalResponse => logger.log('Target userAgent: ' + evalResponse.result.value),
                    err => logger.log('Getting userAgent failed: ' + err.message))
                .then(() => {
                    //const cacheDisabled = (<ICommonRequestArgs>this._launchAttachArgs).disableNetworkCache || false;
                    //this.chrome.Network.setCacheDisabled({ cacheDisabled });
                });
        });
    }

    protected runConnection(): Promise<void>[] {
        return [
            ...super.runConnection(),
            this.chrome.Page.enable()
            //this.chrome.Network.enable({})
        ];
    }

    protected async onPaused(notification: Crdp.Debugger.PausedEvent, expectingStopReason = this._expectingStopReason): Promise<void> {
        return super.onPaused(notification, expectingStopReason);
    }

    protected threadName(): string {
        return 'Chrome';
    }

    protected onResumed(): void {
        super.onResumed();
    }

    public disconnect(args: DebugProtocol.DisconnectArguments): void {
        const hadTerminated = this._hasTerminated;

        // Disconnect before killing Chrome, because running "taskkill" when it's paused sometimes doesn't kill it
        super.disconnect(args);

        if (this._edgeProc && !hadTerminated) {
            // Only kill Chrome if the 'disconnect' originated from vscode. If we previously terminated
            // due to Chrome shutting down, or devtools taking over, don't kill Chrome.
            if (coreUtils.getPlatform() === coreUtils.Platform.Windows && this._edgePID) {
                // Run synchronously because this process may be killed before exec() would run
                const taskkillCmd = `taskkill /F /T /PID ${this._edgePID}`;
                logger.log(`Killing Chrome process by pid: ${taskkillCmd}`);
                try {
                    execSync(taskkillCmd);
                } catch (e) {
                    // Can fail if Chrome was already open, and the process with _chromePID is gone.
                    // Or if it already shut down for some reason.
                }
            } else {
                logger.log('Killing Chrome process');
                this._edgeProc.kill('SIGINT');
            }
        }

        this._edgeProc = null;
    }

    /**
     * Opt-in event called when the 'reload' button in the debug widget is pressed
     */
    public restart(): Promise<void> {
        return this.chrome ?
            this.chrome.Page.reload({ ignoreCache: true }) :
            Promise.resolve();
    }

    private spawnEdge(edgePath: string, edgeArgs: string[], env: {[key: string]: string}, cwd: string, usingRuntimeExecutable: boolean): ChildProcess {
        if (coreUtils.getPlatform() === coreUtils.Platform.Windows && !usingRuntimeExecutable) {
            const options = {
                execArgv: [],
                silent: true
            };
            if (env) {
                options['env'] = {
                    ...process.env,
                    ...env
                };
            }
            if (cwd) {
                options['cwd'] = cwd;
            }
            const edgeProc = fork(getEdgeSpawnHelperPath(), [edgePath, ...edgeArgs], options);
            edgeProc.unref();

            edgeProc.on('message', data => {
                const pidStr = data.toString();
                logger.log('got edge PID: ' + pidStr);
                this._edgePID = parseInt(pidStr, 10);
            });

            edgeProc.on('error', (err) => {
                const errMsg = 'edgeSpawnHelper error: ' + err;
                logger.error(errMsg);
            });

            edgeProc.stderr.on('data', data => {
                logger.error('[edgeSpawnHelper] ' + data.toString());
            });

            edgeProc.stdout.on('data', data => {
                logger.log('[edgeSpawnHelper] ' + data.toString());
            });

            return edgeProc;
        } else {
            logger.log(`spawn('${edgePath}', ${JSON.stringify(edgeArgs) })`);
            const options = {
                detached: true,
                stdio: ['ignore'],
            };
            if (env) {
                options['env'] = {
                    ...process.env,
                    ...env
                };
            }
            if (cwd) {
                options['cwd'] = cwd;
            }
            const edgeProc = spawn(edgePath, edgeArgs, options);
            edgeProc.unref();
            return edgeProc;
        }
    }
}

function getSourceMapPathOverrides(webRoot: string, sourceMapPathOverrides?: ISourceMapPathOverrides): ISourceMapPathOverrides {
    return sourceMapPathOverrides ? resolveWebRootPattern(webRoot, sourceMapPathOverrides, /*warnOnMissing=*/true) :
            resolveWebRootPattern(webRoot, DefaultWebSourceMapPathOverrides, /*warnOnMissing=*/false);
}

/**
 * Returns a copy of sourceMapPathOverrides with the ${webRoot} pattern resolved in all entries.
 *
 * dynamically required by test
 */
export function resolveWebRootPattern(webRoot: string, sourceMapPathOverrides: ISourceMapPathOverrides, warnOnMissing: boolean): ISourceMapPathOverrides {
    const resolvedOverrides: ISourceMapPathOverrides = {};
    for (let pattern in sourceMapPathOverrides) {
        const replacePattern = replaceWebRootInSourceMapPathOverridesEntry(webRoot, pattern, warnOnMissing);
        const replacePatternValue = replaceWebRootInSourceMapPathOverridesEntry(webRoot, sourceMapPathOverrides[pattern], warnOnMissing);

        resolvedOverrides[replacePattern] = replacePatternValue;
    }

    return resolvedOverrides;
}

function replaceWebRootInSourceMapPathOverridesEntry(webRoot: string, entry: string, warnOnMissing: boolean): string {
    const webRootIndex = entry.indexOf('${webRoot}');
    if (webRootIndex === 0) {
        if (webRoot) {
            return entry.replace('${webRoot}', webRoot);
        } else if (warnOnMissing) {
            logger.log('Warning: sourceMapPathOverrides entry contains ${webRoot}, but webRoot is not set');
        }
    } else if (webRootIndex > 0) {
        logger.log('Warning: in a sourceMapPathOverrides entry, ${webRoot} is only valid at the beginning of the path');
    }

    return entry;
}

function getEdgeSpawnHelperPath(): string {
    return path.join(__dirname, 'edgeSpawnHelper.js');
}

function findExecutable(program: string): string | undefined {
    if (process.platform === 'win32' && !path.extname(program)) {
        const PATHEXT = process.env['PATHEXT'];
        if (PATHEXT) {
            const executableExtensions = PATHEXT.split(';');
            for (const extension of executableExtensions) {
                const path = program + extension;
                if (fs.existsSync(path)) {
                    return path;
                }
            }
        }
    }

    if (fs.existsSync(program)) {
        return program;
    }

    return undefined;
}
