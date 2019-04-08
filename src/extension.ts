/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import * as Core from 'vscode-chrome-debug-core';
import * as nls from 'vscode-nls';

import { defaultTargetFilter, getTargetFilter } from './utils';
import * as errors from './errors';
import { ProtocolDetection } from './protocolDetection';

const localize = nls.loadMessageBundle();

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('extension.edge-debug.toggleSkippingFile', toggleSkippingFile));
    context.subscriptions.push(vscode.commands.registerCommand('extension.edge-debug.toggleSmartStep', toggleSmartStep));

    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('edge', new EdgeConfigurationProvider()));
}

export function deactivate() {
}

const DEFAULT_WIN_CONFIG = {
    type: 'edge',
    request: 'launch',
    name: localize('edge.launch.name', 'Launch Edge against localhost'),
    url: 'http://localhost:8080',
    webRoot: '${workspaceFolder}'
};

const DEFAULT_MAC_CONFIG = {
    type: 'edge',
    version: 'stable',
    request: 'launch',
    name: localize('edge.launch.name', 'Launch Edge against localhost'),
    url: 'http://localhost:8080',
    webRoot: '${workspaceFolder}'
};

export class EdgeConfigurationProvider implements vscode.DebugConfigurationProvider {
    private static ATTACH_TIMEOUT = 10000;

    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        if (Core.utils.getPlatform() === Core.utils.Platform.OSX) {
            return Promise.resolve([DEFAULT_MAC_CONFIG]);
        } else {
            return Promise.resolve([DEFAULT_WIN_CONFIG]);
        }
    }

    /**
     * Try to add all missing attributes to the debug configuration being launched.
     */
    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        // if launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            // Return null so it will create a launch.json and fall back on provideDebugConfigurations - better to point the user towards the config
            // than try to work automagically.
            return null;
        }

        // if there is a version flag, switch to using the new msedge
        if (config['version'] || config['runtimeExecutable']) {
            config.type = 'msedge';
        }

        if (config.request === 'attach') {
            const nullLogger = new Core.NullLogger();
            const nullTelemetryReporter = new Core.telemetry.NullTelemetryReporter();

            const discovery = new Core.chromeTargetDiscoveryStrategy.ChromeTargetDiscovery(nullLogger, nullTelemetryReporter);

            let targets;
            try {
                targets = await discovery.getAllTargets(config.address || '127.0.0.1', config.port, config.targetTypes === undefined ? defaultTargetFilter : getTargetFilter(config.targetTypes), config.url || config.urlFilter);
            } catch (e) {
                // Target not running?
            }

            if (targets && targets.length > 1) {
                const selectedTarget = await pickTarget(targets);
                if (!selectedTarget) {
                    // Quickpick canceled, bail
                    return null;
                }

                config.websocketUrl = selectedTarget.websocketDebuggerUrl;
            }

            const protocolDetection = new ProtocolDetection(nullLogger);

            await protocolDetection.hitVersionEndpoint(config.address || '127.0.0.1', config.port, EdgeConfigurationProvider.ATTACH_TIMEOUT)
                .then((detectedBrowserProtocol) => {
                    if (protocolDetection.extractBrowserProtocol(detectedBrowserProtocol).indexOf('Chrome') > -1) {
                        config.type = 'msedge';
                    }
                })
                .catch(async e => {
                    Promise.reject(errors.getNotExistErrorResponse(String(EdgeConfigurationProvider.ATTACH_TIMEOUT), e.message));
                });
        }

        return config;
    }
}

function toggleSkippingFile(path: string): void {
    if (!path) {
        const activeEditor = vscode.window.activeTextEditor;
        path = activeEditor && activeEditor.document.fileName;
    }

    if (path && vscode.debug.activeDebugSession) {
        const args: Core.IToggleSkipFileStatusArgs = typeof path === 'string' ? { path } : { sourceReference: path };
        vscode.debug.activeDebugSession.customRequest('toggleSkipFileStatus', args);
    }
}

function toggleSmartStep(): void {
    if (vscode.debug.activeDebugSession) {
        vscode.debug.activeDebugSession.customRequest('toggleSmartStep');
    }
}

interface ITargetQuickPickItem extends vscode.QuickPickItem {
    websocketDebuggerUrl: string;
}

async function pickTarget(targets: Core.chromeConnection.ITarget[]): Promise<ITargetQuickPickItem> {
    const items = targets.map(target => (<ITargetQuickPickItem>{
        label: unescapeTargetTitle(target.title),
        detail: target.url,
        websocketDebuggerUrl: target.webSocketDebuggerUrl
    }));

    const placeHolder = localize('edge.targets.placeholder', 'Select a tab');
    const selected = await vscode.window.showQuickPick(items, { placeHolder, matchOnDescription: true, matchOnDetail: true });
    return selected;
}

function unescapeTargetTitle(title: string): string {
    return title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, `'`)
        .replace(/&quot;/g, '"');
}