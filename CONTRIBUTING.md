This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

## Development setup
* Clone this repo
* Run `npm install -g gulp` and `npm install` in '/vscode-edge-debug2'
    * You may see an error if `bufferutil` or `utf-8-validate` fail to build. These native modules required by `ws` are optional and the adapter should work fine without them.
* Run `gulp build`

## Developing in the vscode-chrome-debug-core module
Most of the code is actually in [this repo](https://github.com/Microsoft/vscode-chrome-debug-core) which is published in npm as `vscode-chrome-debug-core`. You can clone that repo separately to any directory and use `npm link` to test the extension with a modified version.

## Debugging
In VS Code, run the `launch as server` launch config - it will start the adapter as a server listening on port 4712. In your test app launch.json, include this flag at the top level: `"debugServer": "4712"`. Then you'll be able to debug the adapter in the first instance of VS Code, in its original TypeScript, using sourcemaps.

## Testing
Run `gulp tslint` to check your code against our tslint rules.

Unit tests and integration tests for the debug adapter are currently disabled.

## Naming
* "Client": VS Code
* "Target": The debuggee, which implements the Edge Debug Protocol
* "Server-mode": In the normal use-case, the extension does not run in server-mode. For debugging, you can run it as a debug server - see the 'Debugging' section above.

## Issue tags
* "Bug": Something that should work is broken
* "Enhancement": AKA feature request - adds new functionality
* "Task": Something that needs to be done that doesn't really fix anything or add major functionality. Tests, engineering, documentation, etc.