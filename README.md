<h1 align="center">
  <br>
  VS Code - Debugger for Microsoft Edge
  <br>
</h1>

<h4 align="center">Debug your JavaScript code running in Microsoft Edge from VS Code and Visual Studio.</h4>

A VS Code extension to debug your JavaScript code in the Microsoft Edge browser. This is also used to enable JavaScript debugging inside the Microsoft Edge browser when launched from ASP.Net Projects in Visual Studio.

**Note:** This extension currently supports both Microsoft Edge (Chromium) and Microsoft Edge (EdgeHTML). This extension can debug any version of Microsoft Edge (Chromium) but only some versions of Microsoft Edge (EdgeHTML). To see if your Windows version supports debugging Microsoft Edge (EdgeHTML) via Edge DevTools Protocol, please refer [here](https://docs.microsoft.com/en-us/microsoft-edge/devtools-protocol/).

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

### For debugging inside VS Code
1. [Install the extension.](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-edge)
2. Open the folder containing the project you want to work on.

### For debugging Microsoft Edge (EdgeHTML or Chromium) inside Visual Studio
1. Install a supported version of Windows.
2. Install the latest version of Visual Studio. Debugging Microsoft Edge (EdgeHTML) is supported for VS versions >= 15.7. Debugging Microsoft Edge (Chromium) is supported for VS versions >= 15.9.19.
3. Create an ASP.Net/ASP.Net Core Web Application.
4. Set a breakpoint in your JavaScript/TypeScript file.
5. Select 'Microsoft Edge' from the 'Web Browser' submenu in the debug target dropdown, and then press F5.

### For enabling both Microsoft Edge (EdgeHTML) and Microsoft Edge (Chromium) in Visual Studio
By default, installing Microsoft Edge (Chromium) will overwrite Microsoft Edge (EdgeHTML). To enable both browsers:
1. [Download Microsoft Edge group policy templates.](https://www.microsoftedgeinsider.com/en-us/enterprise)
2. After extracting the template files above, copy the files as shown below:

Source | Destination
--- | ---
<zip&#x2011;extract&#x2011;location>\MicrosoftEdgePolicyTemplates\windows\admx\\*.admx | C:\Windows\PolicyDefinitions
<zip&#x2011;extract&#x2011;location>\MicrosoftEdgePolicyTemplates\windows\admx\\<your-locale\>\\*.adml | C:\Windows\PolicyDefinitions\\<your-locale\>

3. Follow [these instructions](https://docs.microsoft.com/en-us/deployedge/microsoft-edge-sysupdate-access-old-edge) to enable side by side installations.

## Using the debugger
When your launch config is set up, you can debug your project. Pick a launch config from the dropdown on the Debug pane in Code. Press the play button or F5 to start.

### Configuration
The extension operates in two modes - it can launch an instance of Microsoft Edge navigated to your app, or it can attach to a running instance of Edge. Both modes require you to be serving your web application from a local web server, which is started from either a VS Code task or from your command-line. Using the `url` parameter you simply tell VS Code which URL to either open or launch in Edge.

You can configure these modes with a `.vscode/launch.json` file in the root directory of your project. You can create this file manually, or Code will create one for you if you try to run your project, and it doesn't exist yet.

### Launch

Below are two example `launch.json` configs with `"request": "launch"`. You must specify either `file` or `url` to launch Microsoft Edge against a local file or a url. If you use a url, set `webRoot` to the directory that files are served from. This can be either an absolute path or a path using `${workspaceFolder}` (the folder open in Code). Note that `webRoot` is used to resolve urls (like "http://localhost/app.js") to a file on disk (like `/Users/me/project/app.js`), so be careful that it's set correctly.
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch localhost in Microsoft Edge",
            "type": "edge",
            "request": "launch",
            "url": "http://localhost/mypage.html",
            "webRoot": "${workspaceFolder}/wwwroot"
        },
        {
            "name": "Launch index.html in Microsoft Edge",
            "type": "edge",
            "request": "launch",
            "file": "${workspaceFolder}/index.html"
        },
    ]
}
```

#### Microsoft Edge (Chromium)
If the stable release of Microsoft Edge (Chromium) is on your machine, this debug adapter will launch it by default. If you'd like to launch a different channel of Microsoft Edge (Chromium), simply add a `version` attribute to your existing configuration with the version you want to launch (`dev`, `beta`, or `canary`). The example configuration below will launch the Canary version of Microsoft Edge (Chromium):
```json
{
    "name": "Launch localhost in Microsoft Edge (Chromium) Canary",
    "type": "edge",
    "request": "launch",
    "version": "canary",
    "url": "http://localhost/mypage.html",
    "webRoot": "${workspaceFolder}/wwwroot"
}
```

If you want to use a different installation of a Chromium-based browser, you can also set the `runtimeExecutable` field with a path to the browser executable. Note that if you are using the `runtimeExecutable` flag, you should **not** be using `version`.

#### Microsoft Edge (EdgeHTML)
If you do **not** have the stable release of Microsoft Edge (Chromium) on your machine, the debug adapter will launch Microsoft Edge (EdgeHTML) by default. You will have the same default configuration as above.

### Attach
With `"request": "attach"`, you must launch Microsoft Edge with remote debugging enabled in order for the extension to attach to it. Here's how you can do that:

__Windows__
* Open the Command Prompt
* Run `msedge.exe --remote-debugging-port=2015` for Microsoft Edge (Chromium) or `microsoftedge.exe --devtools-server-port=2015` for Microsoft Edge (EdgeHTML)

The example `launch.json` config below will attach to either Microsoft Edge (Chromium) or Microsoft Edge (EdgeHTML) depending on which one you launched on port `2015`.
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "edge",
            "request": "attach",
            "name": "Attach to Microsoft Edge",
            "port": 2015,
            "webRoot": "${workspaceFolder}"
        }
    ]
}
```

### Other optional launch config fields
* `trace`: When true, the adapter logs its own diagnostic info to a file. The file path will be printed in the Debug Console. This is often useful info to include when filing an issue on GitHub. If you set it to "verbose", it will log to a file and also log to the console.
* `version`: When set to `canary`, `dev`, or `beta`, it will launch the matching version of Microsoft Edge (Chromium). If not specified, Microsoft Edge (EdgeHTML) will be launched.
* `runtimeExecutable`: Workspace relative or absolute path to the runtime executable to be used. If not specified, Microsoft Edge (EdgeHTML) will be used from the default install location.
* `runtimeArgs`: Optional arguments passed to the runtime executable.
  ```json
  // Launch in Private Mode
  "runtimeArgs": [
    "--inprivate"
  ]
  ```
* `env`: Optional dictionary of environment key/value pairs.
* `cwd`: Optional working directory for the runtime executable.
* `userDataDir`: Normally, if Microsoft Edge is already running when you start debugging with a launch config, then the new instance won't start in remote debugging mode. So by default, the extension launches Microsoft Edge with a separate user profile in a temp folder. Use this option to set a different path to use, or set to false to launch with your default user profile. Note that this is only applicable to Microsoft Edge (Chromium) and will not work with Microsoft Edge (EdgeHTML).
* `url`: On a 'launch' config, it will launch Microsoft Edge at this URL.
* `urlFilter`: On an 'attach' config, or a 'launch' config with no 'url' set, search for a page with this url and attach to it. It can also contain wildcards, for example, `"localhost:*/app"` will match either `"http://localhost:123/app"` or `"http://localhost:456/app"`, but not `"https://stackoverflow.com"`.
* `targetTypes`: On an 'attach' config, or a 'launch' config with no 'url' set, set a list of acceptable target types from the default `["page"]`. For example, if you are attaching to an Electron app, you might want to set this to `["page", "webview"]`. A value of `null` disables filtering by target type. Note that this is only applicable to Microsoft Edge (Chromium) and will not work with Microsoft Edge (EdgeHTML).
* `sourceMaps`: By default, the adapter will use sourcemaps and your original sources whenever possible. You can disable this by setting `sourceMaps` to false.
* `pathMapping`: This property takes a mapping of URL paths to local paths, to give you more flexibility in how URLs are resolved to local files. `"webRoot": "${workspaceFolder}"` is just shorthand for a pathMapping like `{ "/": "${workspaceFolder}" }`.
* `smartStep`: Automatically steps over code that doesn't map to source files. Especially useful for debugging with async/await.
* `disableNetworkCache`: If true, the network cache will be disabled.
* `showAsyncStacks`: If true, callstacks across async calls (like `setTimeout`, `fetch`, resolved Promises, etc) will be shown.
* `useWebView`: If true or `advanced`, the debugger will treat the `runtimeExecutable` as an application hosting a WebView. See: [Microsoft Edge (Chromium) WebView applications](#Microsoft-Edge-(Chromium)-WebView-applications)

### Microsoft Edge (Chromium) WebView applications
You can also use the debugger to launch applications that are using an embedded [Microsoft Edge (Chromium) WebView](https://docs.microsoft.com/en-us/microsoft-edge/hosting/webview2). With the correct `launch.json` properties, the debugger will launch your host application and attach to the WebView allowing you to debug the running script content.

To use the debugger against a WebView application use the following properties in your launch config:
* `runtimeExecutable`: Set this to the full path to your host application.
* `useWebView`: Set this to be `true` or `advanced` depending on how your host application is using WebViews

In basic scenarios, your host application is using a single WebView that is loaded on launch of your application. If this is the case, you should set `useWebView` to be `true`. This will treat the host application just like it was another browser, attaching to the WebView on launch and failing with a timeout if it cannot find a matching `url` or `urlFilter` within the timeout.

In more advanced scenarios, your host appliation may be using a single WebView that doesn't load until later in your workflow. It may also be using multiple WebViews within the same application, or have a dependency on a specific `userDataDir` setting. In these cases you should set `useWebView` to be `advanced`. This will cause the debugger to treat your host application differently. When launching, the debugger will wait until it gets notified of a WebView that matches the `urlFilter` value without timing out. It will also not override the `userDataDir` internally and may attach on a different `port` value than what is specified in the config if several WebViews created in the host application.

### Other targets
You can also theoretically attach to other targets that support the same [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/tot) as the Microsoft Edge (Chromium) browser, such as Electron or Cordova. These aren't officially supported, but should work with basically the same steps. You can use a launch config by setting `"runtimeExecutable"` to a program or script to launch, or an attach config to attach to a process that's already running. If Code can't find the target, you can always verify that it is actually available by navigating to `http://localhost:<port>/json` in a browser. If you get a response with a bunch of JSON, and can find your target page in that JSON, then the target should be available to this extension.

## Skip files / Mark as Library code
You can use the `skipFiles` property to mark specific files as Library code while debugging. For example, if you set `"skipFiles": ["jquery.js"]`, then you will skip any file named 'jquery.js' when stepping through your code. You also won't break on exceptions thrown from 'jquery.js'. This works the same as "Mark as Library code" in the Microsoft Edge DevTools.

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
If you set `sourceMapPathOverrides` in your launch config, that will override these defaults. `${workspaceFolder}` and `${webRoot}` can be used here. If you aren't sure what the left side should be, you can use the `trace` option to see the contents of the sourcemap, or look at the paths of the sources in the Microsoft Edge DevTools, or open your `.js.map` file and check the values manually.

### Ionic/gulp-sourcemaps note
Ionic and gulp-sourcemaps output a sourceRoot of `"/source/"` by default. If you can't fix this via your build config, we suggest this setting:
```json
"sourceMapPathOverrides": {
    "/source/*": "${workspaceFolder}/*"
}
```

## Troubleshooting

### My breakpoints aren't hit when debugging Microsoft Edge(EdgeHTML). What's wrong?
If your breakpoints weren't hit, it's most likely a sourcemapping issue or because you set breakpoints before launching Microsoft Edge (EdgeHTML) and were expecting them to hit while the browser loads. If that's the case, you will have to refresh the page in Microsoft Edge (EdgeHTML) after we have attached from VS Code/Visual Studio to hit your breakpoint.

If you are using sourcemaps, make sure they are configured right.

### Cannot connect to the target: connect ECONNREFUSED 127.0.0.1:2015
This message means that the extension can't attach to Microsoft Edge, probably because Microsoft Edge wasn't launched in debug mode. Here are some things to try:
* Ensure that the `port` property matches the port on which Microsoft Edge is listening for remote debugging connections. This is `2015` by default. Ensure nothing else is using this port, including your web server. If something else on your computer responds at `http://localhost:2015`, then set a different port.
* If all else fails, try to navigate to `http://localhost:<port>/json/list` in a browser when you see this message - if there is no response, then something is wrong upstream of the extension. If there is a page of JSON returned, then ensure that the `port` in the launch config matches the port in that url.
* If the above steps do not work, try closing all windows of Microsoft Edge and then relaunch.

### General things to try if you're having issues:
* Ensure `webRoot` is set correctly if needed
* Look at your sourcemap config carefully. A sourcemap has a path to the source files, and this extension uses that path to find the original source files on disk. Check the `sourceRoot` and `sources` properties in your sourcemap and make sure that they can be combined with the `webRoot` property in your launch config to build the correct path to the original source files.
* Check the console for warnings that this extension prints in some cases when it can't attach.
* Ensure the code in your browser matches the code in Code. The browser may cache an old version of your code.
* If your breakpoints bind, but aren't hit in Microsoft Edge (EdgeHTML), try refreshing the page. If you set a breakpoint in code that runs immediately when the page loads in Microsoft Edge (EdgeHTML), you won't hit that breakpoint until you refresh the page.

## Feedback
Send us your feedback by [filing an issue](https://github.com/Microsoft/vscode-edge-debug2/issues/new) against this extension's [GitHub repo](https://github.com/Microsoft/vscode-edge-debug2). Please include the debug adapter log file, which is created for each run in the %temp% directory with the name `vscode-edge-debug2.txt`. You can drag this file into an issue comment to upload it to GitHub.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
