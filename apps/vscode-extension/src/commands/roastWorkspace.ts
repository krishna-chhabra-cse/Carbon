import * as vscode from 'vscode';
import { collectWorkspaceFiles } from '../utils/workspaceCollector';
import { getBackendBaseUrl, roastWorkspacePayload } from '../api/carbonClient';

export async function roastWorkspaceCommand(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage(
      'Carbon: No workspace is open. Open a folder in VS Code first.'
    );
    return;
  }

  const rootFolder = workspaceFolders[0];
  const workspaceName = rootFolder.name;

  try {
    const payload = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Carbon: Preparing ${workspaceName} for Roasting...`,
        cancellable: false,
      },
      async (progress) => {
        return await collectWorkspaceFiles(rootFolder, (msg) => {
          progress.report({ message: msg });
        });
      }
    );

    if (payload.files.length === 0) {
      throw new Error('No code files found to roast.');
    }

    vscode.window.showInformationMessage('Carbon: Codebase collected! Opening the Roaster...', 'View Roast');
    
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Carbon: Roasting ${workspaceName}... (this may take a minute)`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Uploading to Carbon AI...' });
        
        const backendUrl = getBackendBaseUrl();
        const data = await roastWorkspacePayload(payload);
        
        if (data.status === 'success') {
          const isLocal = backendUrl.includes('localhost');
          const frontendBase = isLocal ? 'http://localhost:5173' : 'https://carbon.ai'; 
          
          const targetUrl = vscode.Uri.parse(`${frontendBase}/roast/${data.id}`);
          vscode.env.openExternal(targetUrl);
        } else {
          throw new Error(data.error || data.message || 'Unknown error');
        }
      }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    vscode.window.showErrorMessage(`Carbon: ${message}`);
  }
}
