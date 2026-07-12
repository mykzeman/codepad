import * as vscode from "vscode";
import { registerKeyboardPanel, openKeyboardPanel } from "./keyboardPanel";
import { newSymbolCommand, symbolRegistrySearch } from "./symbolMakerCommand";
import { insertModuleImportCommand } from "./moduleReferenceCommand";
import { newWorkspaceWizardCommand } from "./newWorkspaceWizardCommand";

export function activate(context: vscode.ExtensionContext): void {
  registerKeyboardPanel(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("codepad.openKeyboard", () => openKeyboardPanel(context)),
    vscode.commands.registerCommand("codepad.newSymbol", () => void newSymbolCommand()),
    vscode.commands.registerCommand("codepad.insertModuleImport", () => void insertModuleImportCommand()),
    vscode.commands.registerCommand("codepad.insertSymbolReference", () => void insertSymbolReferenceCommand()),
    vscode.commands.registerCommand("codepad.newWorkspaceWizard", () => void newWorkspaceWizardCommand()),
  );
}

async function insertSymbolReferenceCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Codepad: open a file first.");
    return;
  }

  const results = symbolRegistrySearch(editor.document.languageId);
  if (results.length === 0) {
    void vscode.window.showInformationMessage("Codepad: no symbols created yet for this language.");
    return;
  }

  const picked = await vscode.window.showQuickPick(
    results.map((s) => ({ label: s.name, description: s.kindId, detail: s.type })),
    { placeHolder: "Insert reference to..." },
  );
  if (!picked) {
    return;
  }

  await editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      editBuilder.replace(selection, picked.label);
    }
  });
}

export function deactivate(): void {}
