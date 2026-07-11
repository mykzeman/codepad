import * as vscode from "vscode";
import { searchStdlib, planImportInsertion, parseImportPath, type RuleSetImportEntry } from "@codepad/module-reference";
import { ruleSetForLanguage } from "./ruleSets";

export async function insertModuleImportCommand(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Codepad: open a file first.");
    return;
  }

  const ruleSet = ruleSetForLanguage(editor.document.languageId);
  if (!ruleSet) {
    void vscode.window.showWarningMessage(`Codepad: no rule set for language "${editor.document.languageId}".`);
    return;
  }

  const path = await pickStdlibPath(ruleSet.imports.stdlib);
  if (!path) {
    return;
  }

  const document = editor.document;
  const existingLines: { line: number; text: string }[] = [];
  for (let i = 0; i < document.lineCount; i++) {
    const text = document.lineAt(i).text;
    if (parseImportPath(ruleSet.imports, text) !== undefined) {
      existingLines.push({ line: i, text });
    }
  }

  const plan = planImportInsertion(
    ruleSet.imports,
    existingLines.map((l) => l.text),
    path,
  );

  if (plan.alreadyPresent) {
    void vscode.window.showInformationMessage(`Codepad: "${path}" is already imported.`);
    return;
  }

  const insertLine = resolveInsertLine(document, ruleSet.imports.insertPosition, existingLines);

  await editor.edit((editBuilder) => {
    editBuilder.insert(new vscode.Position(insertLine, 0), plan.statement + "\n");
  });
}

function resolveInsertLine(
  document: vscode.TextDocument,
  insertPosition: "top-of-file" | "after-existing-imports",
  existingLines: readonly { line: number; text: string }[],
): number {
  if (existingLines.length > 0) {
    return existingLines[existingLines.length - 1].line + 1;
  }
  if (insertPosition === "top-of-file") {
    return 0;
  }
  for (let i = 0; i < document.lineCount; i++) {
    if (/^\s*package\s+/.test(document.lineAt(i).text)) {
      return i + 1;
    }
  }
  return 0;
}

function pickStdlibPath(entries: readonly RuleSetImportEntry[]): Promise<string | undefined> {
  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick();
    const toItems = (query: string) =>
      searchStdlib(entries, query, 30).map((e) => ({ label: e.label, description: e.path, detail: e.description }));
    qp.items = toItems("");
    qp.placeholder = "Search modules to import";
    qp.onDidChangeValue((value) => {
      qp.items = toItems(value);
    });
    qp.onDidAccept(() => {
      const item = qp.selectedItems[0];
      qp.hide();
      resolve(item?.description);
    });
    qp.onDidHide(() => qp.dispose());
    qp.show();
  });
}
