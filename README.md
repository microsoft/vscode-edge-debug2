<h1 align="center">
  <br>
  VS Code - Debugger for Microsoft Edge
  <br>
</h1>

<h4 align="center">Debug your JavaScript code running in Microsoft Edge from VS Code and Visual Studio.</h4>

A VS Code extension to debug your JavaScript code in the Microsoft Edge browser. This is also used to enable JavaScript debugging inside Edge browser when launched from ASP.Net Projects in Visual Studio.

Note: Edge debugging via [Edge DevTools Protocol](https://docs.microsoft.com/en-us/microsoft-edge/devtools-protocol/) is currently supported on [Windows Insider Preview](https://insider.windows.com/en-us/getting-started/) builds only.

**Supported features**
* Setting breakpoints, including in source files when source maps are enabled
* Stepping, including with the buttons on the Edge page
* The Locals pane
* Debugging eval scripts, script tags, and scripts that are added dynamically
* Watches

**Unsupported scenarios**
* Debugging web workers
* Any features that aren't script debugging.

## Getting Started
We are working on creating and publishing a VS Code Extension for this project.

For use inside Visual Studio:
1. Install the latest [Windows Insider Preview](https://insider.windows.com/en-us/getting-started/) build.
2. Install the latest [Visual Studio 2017 Version 15.7 Preview](https://www.visualstudio.com/vs/preview/) build.
3. Create an ASP.Net/ASP.Net Core Web Application.
4. Select 'Microsoft Edge' from the 'Web Browser' submenu in the debug target dropdown, and then press F5.

## Troubleshooting

### My breakpoints aren't hit. What's wrong?

If your breakpoints weren't hit, it's most likely a sourcemapping issue or because you set breakpoints before launching Edge and were expecting them to hit while the browser loads. If that's the case, you will have to refresh the page in Edge after we have attached from VS Code/Visual Studio to hit your breakpoint.

If you are using sourcemaps, make sure they are configured right.

### Cannot connect to the target: connect ECONNREFUSED 127.0.0.1:2015
This message means that the extension can't attach to Edge, probably because Edge wasn't launched in debug mode. Here are some things to try:
* Ensure that the `port` property matches the port on which Edge is listening for remote debugging connections. This is `2015` by default. Ensure nothing else is using this port, including your web server. If something else on your computer responds at `http://localhost:2015`, then set a different port.
* If all else fails, try to navigate to `http://localhost:<port>/json/list` in a browser when you see this message - if there is no response, then something is wrong upstream of the extension. If there is a page of JSON returned, then ensure that the `port` in the launch config matches the port in that url.
* If the above steps do not work, try closing all windows of Edge and then relaunch.

## Data/Telemetry
This project collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](http://go.microsoft.com/fwlink/?LinkId=521839) to learn more.

To opt out of all telemetry inside Visual Studio, go to Help > Send Feedback > Settings >  `No, I would not like to participate`

To opt out of all telemetry inside Visual Studio Code, go to File > Preferences > Settings and add the following option: `"telemetry.enableTelemetry": false`

## Issues
File a bug in this extension's [GitHub repo](https://github.com/Microsoft/vscode-edge-debug2), including the debug adapter log file. The debug adapter creates a log file for each run in the %temp% directory with the name `vscode-edge-debug2.txt`. You can drag this file into an issue comment to upload it to GitHub.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
