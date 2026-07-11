import * as vscode from "vscode";
import { wizardSteps, renderDeclaration, SymbolRegistry, type SymbolSelections, type RuleSetSymbolKind } from "@codepad/symbol-maker";
import { PredictionEngine } from "@codepad/onscreen-keyboard";
import { ruleSetForLanguage } from "./ruleSets";

const registry = new SymbolRegistry();
const predictionEngine = new PredictionEngine();

export async function newSymbolCommand(): Promise<void> {
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

  const kindPick = await vscode.window.showQuickPick(
    ruleSet.symbolKinds.map((k) => ({ label: k.label, symbolKind: k })),
    { placeHolder: "What do you want to create?" },
  );
  if (!kindPick) {
    return;
  }
  const kind: RuleSetSymbolKind = kindPick.symbolKind;

  const modifiers: Record<string, string[]> = {};
  let type: string | undefined;
  let name: string | undefined;

  for (const step of wizardSteps(kind)) {
    if (step.kind === "modifierGroup") {
      const group = step.group;
      if (group.multiple) {
        const picked = await vscode.window.showQuickPick(
          group.options.map((o) => ({ label: o.label, id: o.id })),
          { placeHolder: group.label, canPickMany: true },
        );
        if (picked === undefined) {
          return;
        }
        modifiers[group.id] = picked.map((p) => p.id);
      } else {
        const picked = await vscode.window.showQuickPick(
          group.options.map((o) => ({ label: o.label, id: o.id })),
          { placeHolder: group.label },
        );
        if (!picked) {
          return;
        }
        modifiers[group.id] = [picked.id];
      }
    } else if (step.kind === "type") {
      const picked = await vscode.window.showQuickPick(step.options.slice(), { placeHolder: "Type" });
      if (!picked) {
        return;
      }
      type = picked;
    } else if (step.kind === "name") {
      const picked = await pickPredictiveName();
      if (!picked) {
        return;
      }
      name = picked;
    }
  }

  if (!name) {
    return;
  }

  const selections: SymbolSelections = { modifiers, type, name };
  const declaration = renderDeclaration(kind, selections);
  await editor.insertSnippet(new vscode.SnippetString(declaration));

  registry.register({
    name,
    kindId: kind.id,
    languageId: ruleSet.languageId,
    type,
    scope: editor.document.uri.fsPath,
    declaration,
  });
  predictionEngine.recordUsage(name);
}

/** Predictive name entry: the QuickPick's suggestion list updates from PredictionEngine as the user types, standing in for the on-screen keyboard's predictive word list. */
function pickPredictiveName(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick();
    qp.placeholder = "Name";
    qp.onDidChangeValue((value) => {
      qp.items = predictionEngine.getSuggestions(value, 5).map((s) => ({ label: s }));
    });
    qp.onDidAccept(() => {
      const value = qp.selectedItems[0]?.label ?? qp.value;
      qp.hide();
      resolve(value || undefined);
    });
    qp.onDidHide(() => qp.dispose());
    qp.show();
  });
}

export function symbolRegistrySearch(languageId: string, text?: string) {
  return registry.search({ languageId, text });
}
