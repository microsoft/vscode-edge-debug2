<h1 align="center">
  <br>
  VS Code - Debugger for Edge
  <br>
</h1>

<h4 align="center">Debug your JavaScript code running in Edge from VS Code.</h4>

A VS Code extension to debug your JavaScript code in the Edge browser.

### Configuration

TUse the `url` parameter to tell VS Code which URL to either open or launch in Edge.

Just like when using the Node debugger, you configure these modes with a `.vscode/launch.json` file in the root directory of your project. You can create this file manually, or Code will create one for you if you try to run your project, and it doesn't exist yet.

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

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
