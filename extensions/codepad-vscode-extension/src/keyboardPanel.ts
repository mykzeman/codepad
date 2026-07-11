import * as vscode from "vscode";
import {
  QWERTY_ROWS,
  QWERTY_NAV_ROWS,
  QWERTY_ARROW_ROWS,
  blocksFromRuleSet,
  type KeyDefinition,
} from "@codepad/onscreen-keyboard";
import { OPERATOR_ROWS } from "@codepad/onscreen-keyboard";
import { MISC_ROWS } from "@codepad/onscreen-keyboard";
import { ruleSetForLanguage } from "./ruleSets";

type PanelRows = readonly (readonly KeyDefinition[])[];

interface KeyboardMessage {
  readonly type: "insertText" | "insertSnippet" | "runCommand";
  readonly text?: string;
  readonly template?: string;
  readonly commandId?: string;
  readonly commandArgs?: readonly unknown[];
}

let currentPanel: vscode.WebviewPanel | undefined;

/** The editor to act on — tracked separately from activeTextEditor since focusing the webview clears that. */
let targetEditor: vscode.TextEditor | undefined;

export function registerKeyboardPanel(context: vscode.ExtensionContext): void {
  targetEditor = vscode.window.activeTextEditor;
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        targetEditor = editor;
      }
    }),
  );
}

export function openKeyboardPanel(context: vscode.ExtensionContext): void {
  if (currentPanel) {
    currentPanel.reveal(vscode.ViewColumn.Beside);
    return;
  }

  const panel = vscode.window.createWebviewPanel("codepadKeyboard", "Codepad Keyboard", vscode.ViewColumn.Beside, {
    enableScripts: true,
    retainContextWhenHidden: true,
  });
  currentPanel = panel;

  const languageId = targetEditor?.document.languageId;
  const ruleSet = languageId ? ruleSetForLanguage(languageId) : undefined;
  const blockRows: PanelRows = ruleSet ? [blocksFromRuleSet(ruleSet)] : [];

  panel.webview.html = getKeyboardHtml(panel.webview, {
    qwerty: QWERTY_ROWS,
    qwertyNav: QWERTY_NAV_ROWS,
    qwertyArrows: QWERTY_ARROW_ROWS,
    blocks: blockRows,
    math: OPERATOR_ROWS,
    misc: MISC_ROWS,
    languageLabel: ruleSet?.displayName ?? languageId ?? "(no active file)",
  });

  panel.webview.onDidReceiveMessage(
    (message: KeyboardMessage) => {
      void handleKeyboardMessage(message);
    },
    undefined,
    context.subscriptions,
  );

  panel.onDidDispose(
    () => {
      currentPanel = undefined;
    },
    undefined,
    context.subscriptions,
  );
}

async function handleKeyboardMessage(message: KeyboardMessage): Promise<void> {
  const editor = targetEditor;
  if (!editor) {
    void vscode.window.showWarningMessage("Codepad: no editor to type into. Open a file first.");
    return;
  }

  switch (message.type) {
    case "insertText":
      if (message.text) {
        await editor.edit((editBuilder) => {
          for (const selection of editor.selections) {
            editBuilder.replace(selection, message.text!);
          }
        });
      }
      break;
    case "insertSnippet":
      if (message.template) {
        await editor.insertSnippet(new vscode.SnippetString(message.template));
      }
      break;
    case "runCommand":
      if (message.commandId) {
        await vscode.commands.executeCommand(message.commandId, ...(message.commandArgs ?? []));
      }
      break;
  }
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getKeyboardHtml(
  webview: vscode.Webview,
  sections: {
    qwerty: PanelRows;
    qwertyNav: PanelRows;
    qwertyArrows: PanelRows;
    blocks: PanelRows;
    math: PanelRows;
    misc: PanelRows;
    languageLabel: string;
  },
): string {
  const nonce = getNonce();
  const dataJson = JSON.stringify(sections).replace(/</g, "\\u003c");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<title>Codepad Keyboard</title>
<style>
  body { font-family: var(--vscode-font-family); padding: 8px; color: var(--vscode-foreground); }
  .tabs { display: flex; gap: 4px; margin-bottom: 8px; flex-wrap: wrap; }
  .tab { padding: 4px 10px; cursor: pointer; border: 1px solid var(--vscode-button-border, transparent); border-radius: 4px; background: var(--vscode-button-secondaryBackground); }
  .tab.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .section { display: none; }
  .section.active { display: block; }
  .row { display: flex; gap: 3px; margin-bottom: 3px; }
  button.key { flex: none; min-width: 28px; height: 32px; padding: 0 6px; cursor: pointer; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-button-border, transparent); border-radius: 3px; font-size: 12px; }
  button.key:hover { background: var(--vscode-button-secondaryHoverBackground); }
  button.key.active-modifier { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .lang-label { opacity: 0.7; font-size: 12px; margin-bottom: 8px; }
</style>
</head>
<body>
  <div class="lang-label">Blocks for: <span id="langLabel"></span></div>
  <div class="tabs" id="tabs"></div>
  <div id="sections"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const data = ${dataJson};
    document.getElementById('langLabel').textContent = data.languageLabel;

    const sectionOrder = [
      ['qwerty', 'QWERTY'],
      ['blocks', 'Blocks'],
      ['math', 'Math / Logic'],
      ['misc', 'Misc'],
    ];

    let shiftActive = false;
    let capsActive = false;

    const tabsEl = document.getElementById('tabs');
    const sectionsEl = document.getElementById('sections');

    function keyLabel(key) {
      if (key.kind === 'character' && (shiftActive || capsActive)) {
        return key.shiftText;
      }
      return key.label;
    }

    function activate(key) {
      switch (key.kind) {
        case 'character': {
          const text = (shiftActive || capsActive) ? key.shiftText : key.text;
          vscode.postMessage({ type: 'insertText', text });
          shiftActive = false;
          render();
          break;
        }
        case 'literal':
          vscode.postMessage({ type: 'insertText', text: key.text });
          break;
        case 'command':
          vscode.postMessage({ type: 'runCommand', commandId: key.commandId, commandArgs: key.commandArgs });
          shiftActive = false;
          render();
          break;
        case 'snippet':
          vscode.postMessage({ type: 'insertSnippet', template: key.template });
          break;
        case 'shift':
          shiftActive = !shiftActive;
          render();
          break;
        case 'capsLock':
          capsActive = !capsActive;
          render();
          break;
      }
    }

    function renderRows(rows) {
      const container = document.createElement('div');
      for (const row of rows) {
        const rowEl = document.createElement('div');
        rowEl.className = 'row';
        for (const key of row) {
          if (key.kind === 'spacer') {
            const spacer = document.createElement('div');
            spacer.style.width = (key.width * 28) + 'px';
            rowEl.appendChild(spacer);
            continue;
          }
          const btn = document.createElement('button');
          btn.className = 'key';
          if ((key.kind === 'shift' && shiftActive) || (key.kind === 'capsLock' && capsActive)) {
            btn.className += ' active-modifier';
          }
          btn.style.minWidth = (key.width * 28) + 'px';
          btn.textContent = keyLabel(key);
          btn.title = key.id;
          btn.addEventListener('click', () => activate(key));
          rowEl.appendChild(btn);
        }
        container.appendChild(rowEl);
      }
      return container;
    }

    let activeSection = 'qwerty';

    function render() {
      tabsEl.innerHTML = '';
      sectionsEl.innerHTML = '';

      for (const [id, label] of sectionOrder) {
        const tab = document.createElement('div');
        tab.className = 'tab' + (id === activeSection ? ' active' : '');
        tab.textContent = label;
        tab.addEventListener('click', () => { activeSection = id; render(); });
        tabsEl.appendChild(tab);

        if (id === activeSection) {
          const section = document.createElement('div');
          section.className = 'section active';
          section.appendChild(renderRows(data[id]));
          if (id === 'qwerty') {
            const navWrap = document.createElement('div');
            navWrap.style.marginTop = '8px';
            navWrap.appendChild(renderRows(data.qwertyNav));
            navWrap.appendChild(renderRows(data.qwertyArrows));
            section.appendChild(navWrap);
          }
          sectionsEl.appendChild(section);
        }
      }
    }

    render();
  </script>
</body>
</html>`;
}
