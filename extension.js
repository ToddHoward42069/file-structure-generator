const vscode = require('vscode');
const path = require('path');

function activate(context) {
  let generateMarkdownDisposable = vscode.commands.registerCommand('markdown-workspace-structure-generator.generateMarkdown', async function () {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return; // No active editor
    }

    const document = editor.document;
    const fileName = document.fileName;
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      return; // No workspace folders
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const relativePath = fileName.replace(rootPath, '');

    let markdownContent = `# File Structure\n\n`;
    markdownContent += `## ${relativePath}\n\n`;

    // Traverse the workspace and generate the markdown file structure
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
    const fileUris = files.map(file => file.fsPath);

    const groupedFiles = {};
    fileUris.forEach(fileUri => {
      const relativeFilePath = fileUri.replace(rootPath, '');
      const dirName = path.dirname(relativeFilePath);
      if (!groupedFiles[dirName]) {
        groupedFiles[dirName] = [];
      }
      groupedFiles[dirName].push(relativeFilePath);
    });

    Object.keys(groupedFiles).sort().forEach(dirName => {
      markdownContent += `### ${dirName}\n\n`;
      groupedFiles[dirName].sort().forEach(filePath => {
        markdownContent += `- [${filePath}](${filePath})\n`;
      });
      markdownContent += '\n';
    });

    // Create a new markdown file and write the content
    const newFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'workspace_structure.md');
    await vscode.workspace.fs.writeFile(newFilePath, Buffer.from(markdownContent));

    // Open the newly created markdown file
    vscode.window.showTextDocument(newFilePath);
  });

  context.subscriptions.push(generateMarkdownDisposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}