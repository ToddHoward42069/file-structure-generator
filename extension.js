const vscode = require('vscode');
const path = require('path');

async function generateFileStructure(rootPath) {
  try {
    // Find all files except those in node_modules
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

    return groupedFiles;
  } catch (error) {
    vscode.window.showErrorMessage(`Error generating file structure: ${error.message}`);
    throw error;
  }
}

function buildMarkdownContent(groupedFiles) {
  let markdownContent = `# File Structure\n\n`;

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

  return markdownContent;
}

function formatPlainTextContent(markdownContent) {
  return markdownContent.replace(/#/g, '').replace(/```/g, '').replace(/\n\n/g, '\n\n');
}

async function writeFileContent(workspaceFolder, content, fileType) {
  try {
    let newFilePath;
    if (fileType === 'Markdown') {
      newFilePath = vscode.Uri.joinPath(workspaceFolder.uri, 'workspace_structure.md');
    } else {
      newFilePath = vscode.Uri.joinPath(workspaceFolder.uri, 'workspace_structure.txt');
      content = formatPlainTextContent(content);
    }

    await vscode.workspace.fs.writeFile(newFilePath, Buffer.from(content));
    vscode.window.showTextDocument(newFilePath);
  } catch (error) {
    vscode.window.showErrorMessage(`Error writing file: ${error.message}`);
    throw error;
  }
}

async function promptUserForFileType() {
  const fileType = await vscode.window.showQuickPick(['Markdown', 'Plain Text'], { placeHolder: 'Choose file type' });
  if (!fileType) {
    throw new Error('User canceled the file type selection');
  }
  return fileType;
}

async function generateMarkdown(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showInformationMessage('No active editor');
    return;
  }

  const document = editor.document;
  const fileName = document.fileName;
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showInformationMessage('No workspace folders');
    return;
  }

  const rootPath = workspaceFolders[0].uri.fsPath;
  const relativePath = fileName.replace(rootPath, '');

  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: "Generating workspace structure",
    cancellable: false
  }, async (progress) => {
    try {
      progress.report({ increment: 0 });
      const groupedFiles = await generateFileStructure(rootPath);
      let markdownContent = `# File Structure\n\n`;
      markdownContent += `## ${relativePath}\n\n`;
      markdownContent += buildMarkdownContent(groupedFiles);

      const fileType = await promptUserForFileType();
      await writeFileContent(workspaceFolders[0], markdownContent, fileType);
      progress.report({ increment: 100, message: "File structure generated successfully!" });
    } catch (error) {
      vscode.window.showErrorMessage(`Error: ${error.message}`);
    }
  });
}

function activate(context) {
  let generateMarkdownDisposable = vscode.commands.registerCommand('markdown-workspace-structure-generator.generateMarkdown', async function () {
    await generateMarkdown(context);
  });

  context.subscriptions.push(generateMarkdownDisposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}
