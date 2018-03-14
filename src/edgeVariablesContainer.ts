import {DebugProtocol} from 'vscode-debugprotocol';
import {logger, variables, Crdp, utils as coreUtils} from 'vscode-chrome-debug-core';
import {EdgeDebugAdapter} from './edgeDebugAdapter';

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

interface EdgeDebugClient extends Crdp.DebuggerClient {
    msSetDebuggerPropertyValue(payload: {
        debuggerPropertyId: string,
        newValue: string
    }): Promise<{}>;
}

export interface ExtendedDebugProtocolVariable extends DebugProtocol.Variable {
    msDebuggerPropertyId?: string;
}

export class MSPropertyContainer extends variables.BaseVariableContainer {
    private _childPropertiesMapping: {
        [propertyName: string]: string
    }

    public constructor(objectId: string, evaluateName?: string) {
        super(objectId, evaluateName);

        this._childPropertiesMapping = {};
    }

    public async expand(adapter: EdgeDebugAdapter, filter?: string, start?: number, count?: number): Promise<DebugProtocol.Variable[]> {
        let variables = await super.expand(adapter, filter, start, count);

        for( let variable of variables) {
            let extendedVarialbe = variable as ExtendedDebugProtocolVariable;

            if (extendedVarialbe.msDebuggerPropertyId) {
                this._childPropertiesMapping[variable.name] = extendedVarialbe.msDebuggerPropertyId;

                // Also remove the additional field from `variable`, so it will not appear when report to PineZorro/VS Code
                delete extendedVarialbe.msDebuggerPropertyId;
            }
        }
        return variables;
    }

    public async setValue(adapter: EdgeDebugAdapter, name: string, value: string): Promise<string> {
        const msDebuggerPropertyId = this._childPropertiesMapping[name];

        if (!msDebuggerPropertyId) {
            logger.error(`Cannot find msDebuggerPropertyId for {name}`);
            throw coreUtils.errP(localize("edge.debug.error.notFoundMsDebuggerPropertyId", "Cannot find msDebuggerPropertyId for a property."));
        }

        const edgeDebugClient: EdgeDebugClient = adapter.chrome.Debugger as EdgeDebugClient;

        let result = await edgeDebugClient.msSetDebuggerPropertyValue({
            "debuggerPropertyId": msDebuggerPropertyId,
            "newValue": value
        });

        return value;
    }
}