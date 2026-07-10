import { commandKey, type KeyDefinition } from "../keyDefinition";

/**
 * Editing commands. Ported from MiscLayouts.cs, recast onto real named
 * VS Code editor commands instead of Ctrl/Shift+key combos — the old
 * app had no other way to invoke them since it worked by injecting
 * keystrokes into whatever app had focus; inside the editor there's a
 * direct command for every one of these.
 */
export const MISC_ROWS: readonly (readonly KeyDefinition[])[] = [
  [
    commandKey("copy", "Copy", "editor.action.clipboardCopyAction", undefined, 3),
    commandKey("cut", "Cut", "editor.action.clipboardCutAction", undefined, 3),
    commandKey("paste", "Paste", "editor.action.clipboardPasteAction", undefined, 3),
    commandKey("undo", "Undo", "undo", undefined, 3),
    commandKey("redo", "Redo", "redo", undefined, 3),
  ],
  [
    commandKey("selectAll", "Select All", "editor.action.selectAll", undefined, 5),
    commandKey("selectLine", "Select Line", "expandLineSelection", undefined, 5),
    commandKey("selectWord", "Select Word", "cursorWordRightSelect", undefined, 5),
  ],
];
