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

export async function blankFileCommand(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");
}

export async function openWorkspaceCommand(): Promise<void> {
  await vscode.commands.executeCommand("workbench.action.files.openFolder");
}

export async function openWorkspaceWithWizardCommand(): Promise<void> {
  await newWorkspaceWizardCommand();
}

export async function newWorkspaceWithGitCommand(): Promise<void> {
  await vscode.commands.executeCommand("git.clone");
}

export async function newWorkspaceWithGitAndWizardCommand(): Promise<void> {
  await newWorkspaceWizardCommand();
}

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
