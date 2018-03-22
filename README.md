<h1 align="center">
  <br>
  VS Code - Debugger for Microsoft Edge
  <br>
</h1>

<h4 align="center">Debug your JavaScript code running in Microsoft Edge from VS Code and Visual Studio.</h4>

A VS Code extension to debug your JavaScript code in the Edge browser. This is also used to enable JavaScript debugging inside Edge browser when launched from ASP.Net Projects inside Visual Studio.
Note: Edge debugging via [Edge DevTools Protocol](https://docs.microsoft.com/en-us/microsoft-edge/devtools-protocol/) is currently supported on [Windows Insider Preview](https://insider.windows.com/en-us/getting-started/) builds only. Afterwards this would work on Windows Version > Redstone 4 (RS4), also known as Windows 10 Spring Creator's update, only.

**Supported features**
* Setting breakpoints, including in source files when source maps are enabled
* Stepping, including with the buttons on the Chrome page
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
4. Select the browser as Microsoft Edge and press f5.

## Troubleshooting

### My breakpoints aren't hit. What's wrong?

If your breakpoints aren't hit, it's most likely a sourcemapping issue or because you are having breakpoints in immediately executed code. If you for example have a breakpoint in a `render function` that runs on page load, sometimes our debugger might not be attached to Edge before the code has been executed. This means that you will have to refresh the page in Edge after we have attached from VS Code/Visual Studio to hit your breakpoint.

If you are using sourcemaps, make sure they are configured right.

### Cannot connect to the target: connect ECONNREFUSED 127.0.0.1:9222
This message means that the extension can't attach to Edge, probably because Edge wasn't launched in debug mode. Here are some things to try:
* Ensure that the `port` property matches the port on which Edge is listening for remote debugging connections. This is `9222` by default. Ensure nothing else is using this port, including your web server. If something else on your computer responds at `http://localhost:9222`, then set a different port.
* If all else fails, try to navigate to `http://localhost:<port>/json/list` in a browser when you see this message - if there is no response, then something is wrong upstream of the extension. If there is a page of JSON returned, then ensure that the `port` in the launch config matches the port in that url.
* If the above steps do not work, try closing all windows of Edge and then relaunch.

## Issues
File a bug in this extension's [GitHub repo](https://github.com/Microsoft/vscode-edge-debug2), including the debug adapter log file. The debug adapter creates a log file for each run in the %temp% directory with the name `vscode-edge-debug2.txt`. You can drag this file into an issue comment to upload it to GitHub.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
