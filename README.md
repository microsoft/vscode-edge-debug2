<h1 align="center">
  <br>
  VS Code - Debugger for Microsoft Edge
  <br>
</h1>

<h4 align="center">Debug your JavaScript code running in Microsoft Edge from VS Code and Visual Studio.</h4>

A VS Code extension to debug your JavaScript code in the Microsoft Edge browser. This is also used to enable JavaScript debugging inside Edge browser when launched from ASP.Net Projects in Visual Studio.

Note: To see if your Windows version supports Edge debugging via Edge DevTools Protocol, please refer [here](https://docs.microsoft.com/en-us/microsoft-edge/devtools-protocol/).

**Supported features**
* Setting breakpoints, including in source files when source maps are enabled
* Stepping through the code
* The Locals pane
* Debugging eval scripts, script tags, and scripts that are added dynamically
* Watches

**Unsupported scenarios**
* Debugging web workers
* Any features that aren't script debugging.

## Getting Started
For use inside VS Code:
1. [Install the extension](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-edge)
2. Restart VS Code and open the folder containing the project you want to work on.

For use inside Visual Studio:
1. Install a supported version of Windows.
2. Install the latest version of Visual Studio. Edge Debugging is supported for VS versions >= 15.7
3. Create an ASP.Net/ASP.Net Core Web Application.
4. Set a breakpoint in your JavaScript/TypeScript file.
5. Select 'Microsoft Edge' from the 'Web Browser' submenu in the debug target dropdown, and then press F5.

## Using the debugger

When your launch config is set up, you can debug your project. Pick a launch config from the dropdown on the Debug pane in Code. Press the play button or F5 to start.

### Configuration

The extension requires you to be serving your web application from local web server, which is started from either a VS Code task or from your command-line. Using the `url` parameter you simply tell VS Code which URL to launch in Edge.

You can configure this with a `.vscode/launch.json` file in the root directory of your project. You can create this file manually, or Code will create one for you if you try to run your project, and it doesn't exist yet.

### Launch
Two example `launch.json` configs with `"request": "launch"`. You must specify either `file` or `url` to launch Edge against a local file or a url. If you use a url, set `webRoot` to the directory that files are served from. This can be either an absolute path or a path using `${workspaceFolder}` (the folder open in Code). `webRoot` is used to resolve urls (like "http://localhost/app.js") to a file on disk (like `/Users/me/project/app.js`), so be careful that it's set correctly.
```json
{
    "version": "0.1.0",
    "configurations": [
        {
            "name": "Launch localhost",
            "type": "edge",
            "request": "launch",
            "url": "http://localhost/mypage.html",
            "webRoot": "${workspaceFolder}/wwwroot"
        },
        {
            "name": "Launch index.html (disable sourcemaps)",
            "type": "edge",
            "request": "launch",
            "sourceMaps": false,
            "file": "${workspaceFolder}/index.html"
        },
    ]
}
```

### Other optional launch config fields
* `trace`: When true, the adapter logs its own diagnostic info to a file. The file path will be printed in the Debug Console. This is often useful info to include when filing an issue on GitHub. If you set it to "verbose", it will also log to the console.
* `url`: On a 'launch' config, it will launch Edge at this URL.
* `sourceMaps`: By default, the adapter will use sourcemaps and your original sources whenever possible. You can disable this by setting `sourceMaps` to false.
* `pathMapping`: This property takes a mapping of URL paths to local paths, to give you more flexibility in how URLs are resolved to local files. `"webRoot": "${workspaceFolder}"` is just shorthand for a pathMapping like `{ "/": "${workspaceFolder}" }`.

## Sourcemaps
The debugger uses sourcemaps to let you debug with your original sources, but sometimes the sourcemaps aren't generated properly and overrides are needed. In the config we support `sourceMapPathOverrides`, a mapping of source paths from the sourcemap, to the locations of these sources on disk. Useful when the sourcemap isn't accurate or can't be fixed in the build process.

The left hand side of the mapping is a pattern that can contain a wildcard, and will be tested against the `sourceRoot` + `sources` entry in the source map. If it matches, the source file will be resolved to the path on the right hand side, which should be an absolute path to the source file on disk.

A few mappings are applied by default, corresponding to some common default configs for Webpack and Meteor:
```javascript
// Note: These are the mappings that are included by default out of the box, with examples of how they could be resolved in different scenarios. These are not mappings that would make sense together in one project.
// webRoot = /Users/me/project
"sourceMapPathOverrides": {
    "webpack:///./~/*": "${webRoot}/node_modules/*",       // Example: "webpack:///./~/querystring/index.js" -> "/Users/me/project/node_modules/querystring/index.js"
    "webpack:///./*":   "${webRoot}/*",                    // Example: "webpack:///./src/app.js" -> "/Users/me/project/src/app.js",
    "webpack:///*":     "*",                               // Example: "webpack:///project/app.ts" -> "/project/app.ts"
    "webpack:///src/*": "${webRoot}/*",                    // Example: "webpack:///src/app.js" -> "/Users/me/project/app.js"
    "meteor://💻app/*": "${webRoot}/*"                    // Example: "meteor://💻app/main.ts" -> "/Users/me/project/main.ts"
}
```
If you set `sourceMapPathOverrides` in your launch config, that will override these defaults. `${workspaceFolder}` and `${webRoot}` can be used here. If you aren't sure what the left side should be, you can use the `trace` option to see the contents of the sourcemap, or look at the paths of the sources in Edge DevTools, or open your `.js.map` file and check the values manually.

### Ionic/gulp-sourcemaps note
Ionic and gulp-sourcemaps output a sourceRoot of `"/source/"` by default. If you can't fix this via your build config, we suggest this setting:
```
"sourceMapPathOverrides": {
    "/source/*": "${workspaceFolder}/*"
}
```

## Troubleshooting

### My breakpoints aren't hit. What's wrong?

If your breakpoints weren't hit, it's most likely a sourcemapping issue or because you set breakpoints before launching Edge and were expecting them to hit while the browser loads. If that's the case, you will have to refresh the page in Edge after we have attached from VS Code/Visual Studio to hit your breakpoint.

If you are using sourcemaps, make sure they are configured right.

### Cannot connect to the target: connect ECONNREFUSED 127.0.0.1:2015
This message means that the extension can't attach to Edge, probably because Edge wasn't launched in debug mode. Here are some things to try:
* Ensure that the `port` property matches the port on which Edge is listening for remote debugging connections. This is `2015` by default. Ensure nothing else is using this port, including your web server. If something else on your computer responds at `http://localhost:2015`, then set a different port.
* If all else fails, try to navigate to `http://localhost:<port>/json/list` in a browser when you see this message - if there is no response, then something is wrong upstream of the extension. If there is a page of JSON returned, then ensure that the `port` in the launch config matches the port in that url.
* If the above steps do not work, try closing all windows of Edge and then relaunch.

## Issues
File a bug in this extension's [GitHub repo](https://github.com/Microsoft/vscode-edge-debug2), including the debug adapter log file. The debug adapter creates a log file for each run in the %temp% directory with the name `vscode-edge-debug2.txt`. You can drag this file into an issue comment to upload it to GitHub.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
