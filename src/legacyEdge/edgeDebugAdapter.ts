/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import { ChromeDebugAdapter as CoreDebugAdapter, logger, utils as coreUtils, ISourceMapPathOverrides,
        IVariablesResponseBody, IEvaluateResponseBody,
        telemetry, Version, TargetVersions } from 'vscode-chrome-debug-core';
import { spawn, ChildProcess, fork, execSync } from 'child_process';
import { Crdp, LoadedSourceEventReason, chromeConnection, chromeUtils, variables, ChromeDebugSession, IOnPausedResult } from 'vscode-chrome-debug-core';
import { DebugProtocol } from 'vscode-debugprotocol';

import { ILaunchRequestArgs, IAttachRequestArgs, ICommonRequestArgs } from './edgeDebugInterfaces';
import { ExtendedDebugProtocolVariable, MSPropertyContainer } from './edgeVariablesContainer';
import * as utils from './utils';
import * as errors from './errors';

import * as nls from 'vscode-nls';
import * as portscanner from 'portscanner';
import { FinishedStartingUpEventArguments } from 'vscode-chrome-debug-core/lib/src/executionTimingsReporter';

let localize = nls.loadMessageBundle();

interface ExtendedEdgeRemoteObject extends Crdp.Runtime.RemoteObject {
    msDebuggerPropertyId: string;
}

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
    private _debuggerId: string;
    private _debugProxyPort: number;
    private _scriptParsedEventBookKeeping = {};
    private _navigatingToUserRequestedUrl = false;
    private _navigationInProgress = false;
    private _unsentLoadedSourceEvents: Crdp.Debugger.ScriptParsedEvent[] = [];
    private _edgeProtocolVersion: Version;

    public initialize(args: DebugProtocol.InitializeRequestArguments): DebugProtocol.Capabilities {
        const capabilities = super.initialize(args);
        capabilities.supportsRestartRequest = true;

        if (args.locale) {
            localize = nls.config({ locale: args.locale })();
        }

        return capabilities;
    }

    private async _checkPortOccupiedByEDP(address: string, port: number): Promise<void> {
        // See if EDP is using the port, if that's the case we can still launch
        // We see if we can hit /json/version endpoint to verify if EDP is running on the port
        const url = `http://${address}:${port}/json/version`;
        logger.log(`Checking if EDP is running on the port by hitting ${url}`);

        const jsonResponse = await coreUtils.getURL(url, { headers: { Host: 'localhost' } })
            .catch(e => {
                // This means /json/version is not available. So the port is being used by another process.
                // Error out in this case.
                logger.log(`There was an error connecting to ${url} : ${e.message}`);
                telemetry.telemetry.reportEvent('portOccupiedByAnotherProcess', port);
                return coreUtils.errP(localize('edge.port.occupied', 'Cannot launch Edge. The specified debugging port {0} is in use by another process. To continue debugging please make sure no process is running on the port.', port));
            });

        // If we reach here that means EDP is running on the port, so we can continue
        logger.log(`Port ${port} is already being used by EDP. Proceeding with the launch.`);
    }

    private async _checkPortOccupied(address = '127.0.0.1', port: number): Promise<void> {

        return portscanner.checkPortStatus(port, address)
        .then( status => {
            logger.log(`Port ${port} status is: ` + status);
            // If port's status is open, it is in use. Take action based on whether EDP is already running on the port or not
            if (status === 'open') {
                return this._checkPortOccupiedByEDP(address, port);
            }
        }, err => {
            logger.log(`There was an error trying to verify port usage: ${err}`);
            telemetry.telemetry.reportEvent('errorCheckingDebuggingPortOccupiedByAnotherProcess', err);
        });
    }

    public async launch(args: ILaunchRequestArgs): Promise<void> {
        const port = args.port || 2015;

        // Check if the port is being used by another process
        this.events.emitStepStarted('Launch.CheckWhetherPortOccupied');
        await this._checkPortOccupied(args.address, port);

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
                return coreUtils.errP(localize('attribute.edge.missing', "Can't find Microsoft Edge - install it or set the \"runtimeExecutable\" field in the launch config."));
            }

            // Start with remote debugging enabled
            const edgeArgs: string[] = [];
            const edgeEnv: {[key: string]: string} = args.env || null;
            const edgeWorkingDir: string = args.cwd || null;

            if (!args.noDebug) {
                edgeArgs.push('--devtools-server-port');
                edgeArgs.push(port.toString());
            }

            let launchUrl: string;
            if (args.file) {
                launchUrl = coreUtils.pathToFileURL(args.file);
            } else if (args.url) {
                launchUrl = args.url;
            }
            if (launchUrl) {
                // We store the launch file/url provided by the user and temporarily launch and attach to a custom landing page using file url.
                // Once we receive configurationDone() event, we redirect the page to the user file/url
                // This is done to facilitate hitting breakpoints on load and to solve timeout issues
                this._userRequestedUrl = launchUrl;
                // The compiled file lives in root/out/src while the landingPage will live in root/
                /* So when this script is getting executed from the %programdata% directory under EdgeAdapter/out/src, we need to find the
                landingPage under EdgeAdapter/ hence we need to go 2 directories up */
                let landingPagePath = path.dirname(path.dirname(path.dirname(__dirname)));
                launchUrl = encodeURI('file:///' + landingPagePath + '/landingPage.html');
                this._breakOnLoadActive = true;

                edgeArgs.push(launchUrl);
            }

            this._edgeProc = this.spawnEdge(runtimeExecutable, edgeArgs, edgeEnv, edgeWorkingDir, !!args.runtimeExecutable);
            this._edgeProc.on('error', (err) => {
                const errMsg = 'Chrome error: ' + err;
                logger.error(errMsg);
                this.terminateSession(errMsg);
            });

            return args.noDebug ? undefined :
                this.doAttach(port, launchUrl || args.urlFilter, args.address, args.timeout, undefined, args.extraCRDPChannelPort)
                .then(() => {
                    this._scriptParsedEventBookKeeping = {};
                    this._debugProxyPort = port;

                    if (!this._chromeConnection.isAttached || !this._chromeConnection.attachedTarget) {
                        throw coreUtils.errP(localize('edge.debug.error.notattached', 'Debugging connection is not attached after the attaching process.'));
                    }

                    this._debuggerId = this._chromeConnection.attachedTarget.id;
                });
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
            this._navigatingToUserRequestedUrl = true;
            this.chrome.Page.navigate({url: this._userRequestedUrl});
            this.events.emitMilestoneReached('RequestedNavigateToUserPage');
        }
        return super.configurationDone();
    }

    protected async onScriptParsed(script: Crdp.Debugger.ScriptParsedEvent): Promise<void> {
        await super.onScriptParsed(script);

        if (this._navigatingToUserRequestedUrl) {
            // Chrome started to navigate to the user's requested url
            this.events.emit(ChromeDebugSession.FinishedStartingUpEventName, { requestedContentWasDetected: true } as FinishedStartingUpEventArguments);
        }
    }

    public commonArgs(args: ICommonRequestArgs): void {
        if (args.webRoot && (!args.pathMapping || !args.pathMapping['/'])) {
            args.pathMapping = args.pathMapping || {};
            args.pathMapping['/'] = args.webRoot;
        }

        args.sourceMaps = typeof args.sourceMaps === 'undefined' || args.sourceMaps;
        args.sourceMapPathOverrides = getSourceMapPathOverrides(args.webRoot, args.sourceMapPathOverrides);
        args.skipFileRegExps = ['^chrome-extension:.*'];

        super.commonArgs(args);
    }

    private processEDPProtocolVersion(version: string): Version {
        // version strings from EDP api are in the form "v0.2" with a prepended "v"
        // EDP api has a bug in it in that version 0.1 of EDP actually returns "v1.2", and they don't plan on fixing it, so here's a check for it
        if (version === 'v1.2') {
            return Version.parse('0.1');
        }
        return Version.parse(version.substring(1));
    }

    protected doAttach(port: number, targetUrl?: string, address?: string, timeout?: number, websocketUrl?: string, extraCRDPChannelPort?: number): Promise<void> {
        return super.doAttach(port, targetUrl, address, timeout, websocketUrl, extraCRDPChannelPort).then(async () => {
            // Don't return this promise, a failure shouldn't fail attach
            const userAgentPromise = this.globalEvaluate({ expression: 'navigator.userAgent', silent: true }).then(evalResponse => evalResponse.result.value);
            userAgentPromise
                .then(
                    userAgent => logger.log('Target userAgent: ' + userAgent),
                    err => logger.log('Getting userAgent failed: ' + err.message));

            const userAgentForTelemetryPromise = userAgentPromise.then(userAgent => {
                const properties = { 'Versions.Target.UserAgent': userAgent };
                const edgeVersionMatch = userAgent.match(/Edge\/([0-9]+(?:.[0-9]+)+)/);
                if (edgeVersionMatch && edgeVersionMatch[1]) {
                    properties['Versions.Target.Version'] = edgeVersionMatch[1];
                }
                return properties;
            });

            const protocolVersionPromise = this._chromeConnection.api.Schema.getDomains().then(
                allDomainsResponse => {
                    return allDomainsResponse.domains.filter(domain => domain.name === 'Debugger');
                },
                err => {
                    logger.log('Error trying to use EDP api for protocol version ' + err.message);
                    return [];
                }
            );

            let protocolVersion = await protocolVersionPromise;
            this._edgeProtocolVersion = protocolVersion.length ? this.processEDPProtocolVersion(protocolVersion[0].version) : Version.unknownVersion();

            // Send the versions information as it's own event so we can easily backfill other events in the user session if needed
            userAgentForTelemetryPromise.then(versionInformation => telemetry.telemetry.reportEvent('target-version', versionInformation));

            // Add version information to all telemetry events from now on
            telemetry.telemetry.addCustomGlobalProperty(userAgentForTelemetryPromise);
        });
    }

    protected runConnection(): Promise<void>[] {
        return [
            ...super.runConnection(),
            this.chrome.Page.enable()
        ];
    }

    protected async onPaused(notification: Crdp.Debugger.PausedEvent, expectingStopReason = this._expectingStopReason): Promise<IOnPausedResult> {
        return super.onPaused(notification, expectingStopReason);
    }

    protected threadName(): string {
        return 'Microsoft Edge';
    }

    protected onResumed(): void {
        super.onResumed();
    }

    public disconnect(args: DebugProtocol.DisconnectArguments): Promise<void> {
        const hadTerminated = this._hasTerminated;

        // Disconnect before killing Edge
        super.disconnect(args);

        if (!hadTerminated) {
            if (!this._debuggerId) {
                throw coreUtils.errP(localize('edge.debug.error.nodebuggerID', 'Cannot find a debugger id.'));
            }

            const closeTabApiUrl = `http://127.0.0.1:${this._debugProxyPort}/json/close/${this._debuggerId}`;
            return coreUtils.getURL(closeTabApiUrl).then(() => {
                this._edgeProc = null;
            }, (e) => {
                logger.log(`Cannot call close API, ${require('util').inspect(e)}`);
            });
        }
    }

    /**
     * Opt-in event called when the 'reload' button in the debug widget is pressed
     */
    public restart(): Promise<void> {
        return this.chrome ?
            this.chrome.Page.reload({ ignoreCache: true }) :
            Promise.resolve();
    }

    public async variables(args: DebugProtocol.VariablesArguments): Promise<IVariablesResponseBody> {
        let variablesResponse = await super.variables(args);
        let filteredVariables: DebugProtocol.Variable[] = [];

        for (let variable of variablesResponse.variables) {
            const variableName = variable.name;
            // We want to filter out entries like "[function return value]", since we do not have a way
            // to change "its value". On the other hand, Chrome's debug protocol never returns entries
            // of this kind.
            if (variableName && variableName[0] === '[' && variableName[variableName.length - 1] === ']') {
                continue;
            }

            // Also filter the `arguments` automatic variable to be in line with what Chrome reports.
            // Plus, changing the `callee`, `caller` fields of this `arguments` will yield an error. We
            // don't have a way to handle it right now.
            if (variableName === 'arguments' && variable.value === 'Arguments') {
                continue;
            }

            filteredVariables.push(variable);
        }

        variablesResponse.variables = filteredVariables;
        return variablesResponse;
    }

    // temporary work around for edge
    public async evaluate(args: DebugProtocol.EvaluateArguments): Promise<IEvaluateResponseBody> {
        return super.evaluate(args).then(evalResponseBody => {
            if (evalResponseBody.type === 'Object' && evalResponseBody.result === '' && evalResponseBody.indexedVariables === undefined) {
                return coreUtils.errP(errors.evalNotAvailableMsg);
            } else {
                return Promise.resolve(evalResponseBody);
            }
        });
    }

    private async sendBackloggedLoadedSourceEvents(): Promise<void> {
        await Promise.all(this._unsentLoadedSourceEvents.map(script => this.sendLoadedSourceEvent(script)));
        this._unsentLoadedSourceEvents = [];
    }

    protected onExecutionContextsCleared(): Promise<void> {
        this._navigationInProgress = true;
        return super.onExecutionContextsCleared().then(() => {
            this._navigationInProgress = false;
            this.sendBackloggedLoadedSourceEvents();
        });
    }

    protected clearTargetContext(): void {
        super.clearTargetContext();
        this._scriptParsedEventBookKeeping = {};
    }

    protected async sendLoadedSourceEvent(script: Crdp.Debugger.ScriptParsedEvent): Promise<void> {
        // If navigation is in progress, we wait for it to complete before sending any new script loaded events
        // This is done because in case of quick refreshes, we end up sending 'changed' events for new scripts because
        // scriptParsedEventBookKeeping hasn't been refreshed yet
        if (!this._navigationInProgress) {
            let loadedSourceReason: LoadedSourceEventReason;
            if (!this._scriptParsedEventBookKeeping[script.scriptId]) {
                this._scriptParsedEventBookKeeping[script.scriptId] = true;
                loadedSourceReason = 'new';
            } else {
                loadedSourceReason = 'changed';
            }
            return super.sendLoadedSourceEvent(script, loadedSourceReason);
        } else {
            // If navigation is in progress, create an array for unsent loaded source events and send them once navigation is done
            this._unsentLoadedSourceEvents.push(script);
        }

    }

    private spawnEdge(edgePath: string, edgeArgs: string[], env: {[key: string]: string}, cwd: string, usingRuntimeExecutable: boolean): ChildProcess {
        this.events.emitStepStarted('LaunchTarget.LaunchExe');
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

    public createPrimitiveVariable(name: string, object: Crdp.Runtime.RemoteObject, parentEvaluateName?: string, stringify?: boolean): DebugProtocol.Variable {
        let variable: ExtendedDebugProtocolVariable = super.createPrimitiveVariable(name, object, parentEvaluateName);
        const edgeRemoteObject = object as ExtendedEdgeRemoteObject;
        if (edgeRemoteObject.msDebuggerPropertyId) {
            variable.msDebuggerPropertyId = edgeRemoteObject.msDebuggerPropertyId;
        }

        return variable;
    }

    protected createPropertyContainer(object: Crdp.Runtime.RemoteObject, evaluateName: string): variables.IVariableContainer {
        /**
         * For EDP version 0.1 (RS4) Debugger.msSetDebuggerPropertyValue should be used for variables with msDebuggerPropertyId because Runtime.callFunctionOn will not work.
         * For EDP version 0.2 (RS5) we should use Runtime.callFunctionOn for all cases
         */
        const useRuntimeCallFunctionOnForAllVariables = this._edgeProtocolVersion.isAtLeastVersion(0, 2);
        return new MSPropertyContainer(object.objectId, useRuntimeCallFunctionOnForAllVariables, evaluateName);
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
                const programPath = program + extension;
                if (fs.existsSync(programPath)) {
                    return programPath;
                }
            }
        }
    }

    if (fs.existsSync(program)) {
        return program;
    }

    return undefined;
}

function doesProcessExist(pid: number) {
    try {
        process.kill(pid, 0);
    } catch (e) {
        if (e.code === 'ESRCH') {
            return false;
        }
        throw e;
    }

    return true;
}
