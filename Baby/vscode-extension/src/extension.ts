// ============================================================
//  src/extension.ts — Extension entry point
// ============================================================

import * as vscode from 'vscode';
import { analyzeWorkspaceCommand } from './commands/analyzeWorkspace';

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(
    'carbon.explainWorkspace',
    analyzeWorkspaceCommand
  );

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // Nothing to clean up yet.
}
