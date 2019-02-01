/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
/* tslint:disable:typedef */
// Copied from -core because I don't want to include test stuff in the npm package

import { EventEmitter } from 'events';
import { Mock, It, IMock } from 'typemoq';
import { Crdp } from 'vscode-chrome-debug-core';

export interface IMockEdgeConnectionAPI {
    apiObjects: Crdp.ProtocolApi;

    Browser: IMock<Crdp.BrowserApi>;
    Console: IMock<Crdp.ConsoleApi>;
    Debugger: IMock<Crdp.DebuggerApi>;
    Runtime: IMock<Crdp.RuntimeApi>;
    Inspector: IMock<Crdp.InspectorApi>;
    Network: IMock<Crdp.NetworkApi>;
    Page: IMock<Crdp.PageApi>;
    Log: IMock<Crdp.LogApi>;
    Schema: IMock<Crdp.SchemaApi>;

    mockEventEmitter: EventEmitter;
}

function getBrowserStubs() {
    return {
        getVersion() { return Promise.resolve({}); }
    };
}

// See https://github.com/florinn/typemoq/issues/20
function getConsoleStubs() {
    return {
        enable() { },
        on(eventName, handler) { }
    };
}

function getDebuggerStubs(mockEventEmitter) {
    return {
        setBreakpoint() { },
        setBreakpointByUrl() { },
        removeBreakpoint() { },
        enable() { },
        evaluateOnCallFrame() { },
        setBlackboxPatterns() { return Promise.resolve(); },
        setAsyncCallStackDepth() { },

        on(eventName, handler) { mockEventEmitter.on(`Debugger.${eventName}`, handler); }
    };
}

function getNetworkStubs() {
    return {
        enable() { },
        setCacheDisabled() { }
    };
}

function getRuntimeStubs(mockEventEmitter) {
    return {
        enable() { },
        evaluate() { },

        on(eventName, handler) { mockEventEmitter.on(`Runtime.${eventName}`, handler); }
    };
}

function getInspectorStubs(mockEventEmitter) {
    return {
        on(eventName, handler) { mockEventEmitter.on(`Inspector.${eventName}`, handler); }
    };
}

function getPageStubs() {
    return {
        enable() { },
        on(eventName, handler) { }
    };
}

function getLogStubs() {
    return {
        enable() { return Promise.resolve(); },
        on(eventName, handler) { }
    };
}

function getSchemaStubs() {
    return {
        getDomains() { return Promise.resolve({domains: []}); }
    };
}

export function getMockEdgeConnectionApi(): IMockEdgeConnectionAPI {
    const mockEventEmitter = new EventEmitter();

    const mockConsole = Mock.ofInstance<Crdp.ConsoleApi>(<any>getConsoleStubs());
    mockConsole.callBase = true;
    mockConsole
        .setup(x => x.enable())
        .returns(() => Promise.resolve());

    const mockDebugger = Mock.ofInstance<Crdp.DebuggerApi>(<any>getDebuggerStubs(mockEventEmitter));
    mockDebugger.callBase = true;
    mockDebugger
        .setup(x => x.enable())
        .returns(() => Promise.resolve(null));

    const mockNetwork = Mock.ofInstance<Crdp.NetworkApi>(<any>getNetworkStubs());
    mockNetwork.callBase = true;
    mockNetwork
        .setup(x => x.enable(It.isAny()))
        .returns(() => Promise.resolve());

    const mockRuntime = Mock.ofInstance<Crdp.RuntimeApi>(<any>getRuntimeStubs(mockEventEmitter));
    mockRuntime.callBase = true;
    mockRuntime
        .setup(x => x.enable())
        .returns(() => Promise.resolve());

    const mockInspector = Mock.ofInstance<Crdp.InspectorApi>(<any>getInspectorStubs(mockEventEmitter));
    mockInspector.callBase = true;

    const mockPage = Mock.ofInstance<Crdp.PageApi>(<any>getPageStubs());

    const mockLog = Mock.ofInstance<Crdp.LogApi>(<any>getLogStubs());
    mockLog.callBase = true;

    const mockBrowser = Mock.ofInstance<Crdp.BrowserApi>(<any>getBrowserStubs());
    mockBrowser.callBase = true;

    const mockSchema = Mock.ofInstance<Crdp.SchemaApi>(<any>getSchemaStubs());
    mockSchema.callBase = true;

    const edgeConnectionAPI: Crdp.ProtocolApi = <any>{
        Browser: mockBrowser.object,
        Console: mockConsole.object,
        Debugger: mockDebugger.object,
        Runtime: mockRuntime.object,
        Inspector: mockInspector.object,
        Network: mockNetwork.object,
        Page: mockPage.object,
        Log: mockLog.object,
        Schema: mockSchema.object
    };

    return {
        apiObjects: edgeConnectionAPI,

        Browser: mockBrowser,
        Console: mockConsole,
        Debugger: mockDebugger,
        Runtime: mockRuntime,
        Inspector: mockInspector,
        Network: mockNetwork,
        Page: mockPage,
        Log: mockLog,
        Schema: mockSchema,

        mockEventEmitter
    };
}