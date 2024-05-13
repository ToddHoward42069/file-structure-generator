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
      markdownContent += `- ${dirName}\n`;
      const dirPathParts = dirName.split(path.sep);
      let indentLevel = dirPathParts.length - 1;
      groupedFiles[dirName].sort().forEach(filePath => {
        const filePathParts = filePath.split(path.sep);
        const indent = '  '.repeat(indentLevel);
        markdownContent += `${indent}- ${filePathParts[filePathParts.length - 1]}\n`;
      });
      markdownContent += '\n';
    });

    // Prompt the user to choose between markdown and plain text
    const fileType = await vscode.window.showQuickPick(['Markdown', 'Plain Text'], { placeHolder: 'Choose file type' });

    if (!fileType) {
      return; // User canceled the selection
    }

    let newFilePath;
    let fileContent = markdownContent;

    if (fileType === 'Markdown') {
      newFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'workspace_structure.md');
    } else {
      newFilePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'workspace_structure.txt');
      fileContent = fileContent.replace(/#/g, '').replace(/```/g, '').replace(/\n\n/g, '\n\n');
    }

    await vscode.workspace.fs.writeFile(newFilePath, Buffer.from(fileContent));

    // Open the newly created file
    vscode.window.showTextDocument(newFilePath);
  });

  context.subscriptions.push(generateMarkdownDisposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}