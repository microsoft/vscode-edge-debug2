import { DebugProtocol } from 'vscode-debugprotocol';
import { logger, variables, Crdp, utils as coreUtils } from 'vscode-chrome-debug-core';
import { EdgeDebugAdapter } from './edgeDebugAdapter';

import * as nls from 'vscode-nls';
const localize = nls.loadMessageBundle();

interface EdgeDebugClient extends Crdp.DebuggerApi {
    msSetDebuggerPropertyValue(payload: {
        debuggerPropertyId: string,
        newValue: string
    }): Promise<{}>;
}

export interface ExtendedDebugProtocolVariable extends DebugProtocol.Variable {
    msDebuggerPropertyId?: string;
}

export class MSPropertyContainer extends variables.PropertyContainer {
    private _childPropertiesMapping: Map<string, string>;

    public constructor(objectId: string, private _useRuntimeCallFunctionOnForAllVariables: boolean, evaluateName?: string) {
        super(objectId, evaluateName);

        this._childPropertiesMapping = new Map<string, string>();
    }

    public async expand(adapter: EdgeDebugAdapter, filter?: string, start?: number, count?: number): Promise<DebugProtocol.Variable[]> {
        let vars = await super.expand(adapter, filter, start, count);

        for (let variable of vars) {
            let extendedVarialbe = variable as ExtendedDebugProtocolVariable;

            if (extendedVarialbe.msDebuggerPropertyId) {
                this._childPropertiesMapping.set(variable.name, extendedVarialbe.msDebuggerPropertyId);

                // Also remove the additional field from `variable`, so it will not appear when report to PineZorro/VS Code
                delete extendedVarialbe.msDebuggerPropertyId;
            }
        }
        return vars;
    }

    public async setValue(adapter: EdgeDebugAdapter, name: string, value: string): Promise<string> {
        const msDebuggerPropertyId = this._childPropertiesMapping.get(name);

        if (this._useRuntimeCallFunctionOnForAllVariables || !msDebuggerPropertyId) {
            // If msDebuggerPropertyId is not present, default to super setValue for this variable.
            await super.setValue(adapter, name, value)
                .catch(() => {
                    throw coreUtils.errP(localize('edge.debug.error.msSetDebuggerPropertyValue', 'Unable to update the value for this property.'));
                });
            return value;
        }

        const edgeDebugClient: EdgeDebugClient = adapter.chrome.Debugger as EdgeDebugClient;

        await edgeDebugClient.msSetDebuggerPropertyValue({
            'debuggerPropertyId': msDebuggerPropertyId,
            'newValue': value
        }).catch(() => {
            throw coreUtils.errP(localize('edge.debug.error.msSetDebuggerPropertyValue', 'Unable to update the value for this property.'));
        });

        return value;
    }
}