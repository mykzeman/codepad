import * as vscode from "vscode";
import { ruleSetForLanguage, type RuleSet } from "./ruleSets";

const SUPPORTED_LANGUAGES: readonly string[] = ["c", "java", "kotlin"];

const STARTER_FILES: Record<string, { fileName: string; content: string }> = {
  c: {
    fileName: "main.c",
    content: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, Codepad!\\n");\n    return 0;\n}\n',
  },
  java: {
    fileName: "Main.java",
    content:
      'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Codepad!");\n    }\n}\n',
  },
  kotlin: {
    fileName: "Main.kt",
    content: 'fun main() {\n    println("Hello, Codepad!")\n}\n',
  },
};

/**
 * Replaces the welcome page's "Connect to..." remote-workspace entry.
 * Click-only, no typed paths: language from a QuickPick, folder from the
 * native OS folder picker (which has its own point-and-click "New Folder"
 * affordance), starter file written and the folder opened as the new
 * workspace.
 */
export async function newWorkspaceWizardCommand(): Promise<void> {
  const languagePick = await vscode.window.showQuickPick(
    SUPPORTED_LANGUAGES.map((id) => {
      const ruleSet = ruleSetForLanguage(id) as RuleSet;
      return { label: ruleSet.displayName, languageId: id };
    }),
    { placeHolder: "Language for the new workspace" },
  );
  if (!languagePick) {
    return;
  }

  const folderUris = await vscode.window.showOpenDialog({
    canSelectFolders: true,
    canSelectFiles: false,
    canSelectMany: false,
    openLabel: "Use as new workspace folder",
    title: "Choose or create a folder for the new workspace",
  });
  if (!folderUris || folderUris.length === 0) {
    return;
  }
  const folderUri = folderUris[0];

  const starter = STARTER_FILES[languagePick.languageId];
  const fileUri = vscode.Uri.joinPath(folderUri, starter.fileName);

  await vscode.workspace.fs.writeFile(fileUri, Buffer.from(starter.content, "utf8"));

  await vscode.commands.executeCommand("vscode.openFolder", folderUri, { forceNewWindow: false });
}
