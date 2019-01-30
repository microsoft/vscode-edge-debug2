<h1 align="center">
  VS Code - Debugger for Edge
  <br>
  <br>
</h1>

<h4 align="center">Debug your JavaScript code running in Microsoft Edge from VS Code.</h4>

A VS Code extension to debug your JavaScript code in the Microsoft Edge browser from VS Code.

**Supported features**
* Setting breakpoints, including in source files when source maps are enabled
* Stepping through the code
* The Locals pane
* Debugging eval scripts, script tags, and scripts that are added dynamically
* Watches

**Unsupported scenarios**
* Debugging web workers
* Features that aren't script debugging.

## Getting Started
1. [Install the extension](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-edge)
2. Restart VS Code and open the folder containing the project you want to work on.

## Using the debugger

When your launch config is set up, you can debug your project. Pick a launch config from the dropdown on the Debug pane in Code. Press the play button or F5 to start.

### Configuration

The extension operates in two modes - it can launch an instance of Microsoft Edge navigated to your app, or it can attach to a running instance of Edge. Both modes require you to be serving your web application from a local web server, which is started from either a VS Code task or from your command-line. Using the `url` parameter you simply tell VS Code which URL to either open or launch in Edge.

You can configure these modes with a `.vscode/launch.json` file in the root directory of your project. You can create this file manually, or Code will create one for you if you try to run your project, and it doesn't exist yet.

### Launch

Here are two example `launch.json` configs with `"request": "launch"`. You must specify either `file` or `url` to launch Edge against a local file or a url. If you use a url, set `webRoot` to the directory that files are served from. This can be either an absolute path or a path using `${workspaceFolder}` (the folder open in Code). `webRoot` is used to resolve urls (like "http://localhost/app.js") to a file on disk (like `/Users/me/project/app.js`), so be careful that it's set correctly.
```json
{
    "version": "0.1.0",
    "configurations": [
        {
            "name": "Launch localhost",
            "type": "edge",
            "version": "beta",
            "request": "launch",
            "url": "http://localhost/mypage.html",
            "webRoot": "${workspaceFolder}/wwwroot"
        },
        {
            "name": "Launch index.html",
            "type": "edge",
            "request": "launch",
            "sourceMaps": false,
            "file": "${workspaceFolder}/index.html"
        },
    ]
}
```

If you want to use a different installation of a Chromium-based browser, you can also set the `runtimeExecutable` field with a path to the browser executable. On machines with the Microsoft EdgeHTML browser, simply omit the `version` flag (such as in the `Launch index.html` example above).

### Attach
With `"request": "attach"`, you must launch Edge with remote debugging enabled in order for the extension to attach to it. Here's how you can do that:

__Windows__
* Right click the Edge shortcut, and select properties
* In the "target" field, append `--remote-debugging-port=2015` for Microsoft Edge (Chromium), or append `--devtools-server-port 2015` for Microsoft Edge (EdgeHTML)

An example `launch.json` file for an "attach" config.
```json
{
    "version": "0.1.0",
    "configurations": [
        {
            "name": "Attach to url with files served from ./out",
            "type": "edge",
            "request": "attach",
            "port": 2015,
            "url": "<url of the open browser page to connect to>",
            "webRoot": "${workspaceFolder}/out"
        }
    ]
}
```

### Other optional launch config fields
* `trace`: When true, the adapter logs its own diagnostic info to a file. The file path will be printed in the Debug Console. This is often useful info to include when filing an issue on GitHub. If you set it to "verbose", it will log to a file and also log to the console.
* `runtimeExecutable`: Workspace relative or absolute path to the runtime executable to be used. If not specified, Microsoft Edge will be used from the default install location.
* `runtimeArgs`: Optional arguments passed to the runtime executable.
* `env`: Optional dictionary of environment key/value pairs.
* `cwd`: Optional working directory for the runtime executable.
* `userDataDir`: Normally, if Edge is already running when you start debugging with a launch config, then the new instance won't start in remote debugging mode. So by default, the extension launches Edge with a separate user profile in a temp folder. Use this option to set a different path to use, or set to false to launch with your default user profile. Note that this is only applicable to Microsoft Edge (Chromium) and will not work with Microsoft Edge (EdgeHTML).
* `url`: On a 'launch' config, it will launch Edge at this URL.
* `urlFilter`: On an 'attach' config, or a 'launch' config with no 'url' set, search for a page with this url and attach to it. It can also contain wildcards, for example, `"localhost:*/app"` will match either `"http://localhost:123/app"` or `"http://localhost:456/app"`, but not `"https://stackoverflow.com"`.
* `targetTypes`: On an 'attach' config, or a 'launch' config with no 'url' set, set a list of acceptable target types from the default `["page"]`. For example, if you are attaching to an Electron app, you might want to set this to `["page", "webview"]`. A value of `null` disables filtering by target type. Note that this is only applicable to Microsoft Edge (Chromium) and will not work with Microsoft Edge (EdgeHTML).
* `sourceMaps`: By default, the adapter will use sourcemaps and your original sources whenever possible. You can disable this by setting `sourceMaps` to false.
* `pathMapping`: This property takes a mapping of URL paths to local paths, to give you more flexibility in how URLs are resolved to local files. `"webRoot": "${workspaceFolder}"` is just shorthand for a pathMapping like `{ "/": "${workspaceFolder}" }`.
* `smartStep`: Automatically steps over code that doesn't map to source files. Especially useful for debugging with async/await.
* `disableNetworkCache`: If true, the network cache will be disabled.
* `showAsyncStacks`: If true, callstacks across async calls (like `setTimeout`, `fetch`, resolved Promises, etc) will be shown.

### Other targets
You can also theoretically attach to other targets that support the same Chrome Debugging protocol as the Microsoft Edge (Chromium) browser, such as Electron or Cordova. These aren't officially supported, but should work with basically the same steps. You can use a launch config by setting `"runtimeExecutable"` to a program or script to launch, or an attach config to attach to a process that's already running. If Code can't find the target, you can always verify that it is actually available by navigating to `http://localhost:<port>/json` in a browser. If you get a response with a bunch of JSON, and can find your target page in that JSON, then the target should be available to this extension.

## Skip files / Blackboxing / Ignore files
You can use the `skipFiles` property to ignore/blackbox specific files while debugging. For example, if you set `"skipFiles": ["jquery.js"]`, then you will skip any file named 'jquery.js' when stepping through your code. You also won't break on exceptions thrown from 'jquery.js'. This works the same as "blackboxing scripts" in Chrome DevTools.

The supported formats are:
  * The name of a file (like `jquery.js`)
  * The name of a folder, under which to skip all scripts (like `node_modules`)
  * A path glob, to skip all scripts that match (like `node_modules/react/*.min.js`)

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
If you set `sourceMapPathOverrides` in your launch config, that will override these defaults. `${workspaceFolder}` and `${webRoot}` can be used here. If you aren't sure what the left side should be, you can use the `.scripts` command (details below). You can also use the `trace` option to see the contents of the sourcemap, or look at the paths of the sources in Chrome DevTools, or open your `.js.map` file and check the values manually.

### Ionic/gulp-sourcemaps note
Ionic and gulp-sourcemaps output a sourceRoot of `"/source/"` by default. If you can't fix this via your build config, I suggest this setting:
```json
"sourceMapPathOverrides": {
    "/source/*": "${workspaceFolder}/*"
}
```

## Troubleshooting

### Cannot connect to the target: connect ECONNREFUSED 127.0.0.1:2015
This message means that the extension can't attach to Edge, probably because Edge wasn't launched in debug mode. Here are some things to try:
* Ensure that the port property matches the `port` on which Edge is listening for remote debugging connections. This is `2015` by default. Ensure nothing else is using this port, including your web server. If something else on your computer responds at `http://localhost:2015`, then set a different port.
* If using an `attach` type config, ensure that you launched your browser with a remote debugging port.
* If all else fails, try to navigate to `http://localhost:<port>/json` in a browser when you see this message - if there is no response, then something is wrong upstream of the extension. If there is a page of JSON returned, then ensure that the `port` in the launch config matches the port in that url.

### General things to try if you're having issues:
* Ensure `webRoot` is set correctly if needed
* Look at your sourcemap config carefully. A sourcemap has a path to the source files, and this extension uses that path to find the original source files on disk. Check the `sourceRoot` and `sources` properties in your sourcemap and make sure that they can be combined with the `webRoot` property in your launch config to build the correct path to the original source files.
* Check the console for warnings that this extension prints in some cases when it can't attach.
* Ensure the code in your browser matches the code in Code. The browser may cache an old version of your code.
* If your breakpoints bind, but aren't hit, try refreshing the page. If you set a breakpoint in code that runs immediately when the page loads, you won't hit that breakpoint until you refresh the page.
* File a bug in this extension's [GitHub repo](https://github.com/Microsoft/vscode-edge-debug2), including the debug adapter log file. Create the log file by setting the "trace" field in your launch config and reproducing the issue. It will print the path to the log file at the top of the Debug Console. You can drag this file into an issue comment to upload it to GitHub.

---

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
