/**
 * Data model for one key on the on-screen keyboard, ported from the old WPF
 * overlay's KeyDefinition/KeyKind. Two changes from that version, both a
 * consequence of running inside the editor instead of as an external
 * overlay: there's no VirtualKey kind (no keystrokes to synthesize — text
 * goes in through the editor API directly), and there's no CaretMarker
 * (VS Code snippets already have a final tab stop, $0, for the same
 * purpose). Editing actions (copy/undo/select-all/...) that used to be
 * Ctrl/Alt/Win key combos are now a single "command" kind that names a real
 * editor command — which also means there's no generic modifier-latch state
 * to manage anymore; Shift/CapsLock remain because they still change what a
 * Character key actually inserts.
 */

export type KeyKind = "character" | "literal" | "command" | "snippet" | "spacer" | "shift" | "capsLock";

interface KeyDefinitionCommon {
  readonly id: string;
  readonly label: string;
  /** Relative width within its row; a standard key is 1. */
  readonly width: number;
}

export interface CharacterKey extends KeyDefinitionCommon {
  readonly kind: "character";
  /** Text typed when neither Shift nor Caps Lock is active. */
  readonly text: string;
  /** Text typed when Shift or Caps Lock is active. */
  readonly shiftText: string;
}

export interface LiteralKey extends KeyDefinitionCommon {
  readonly kind: "literal";
  /** Typed verbatim regardless of shift/caps state — for operators like "==". */
  readonly text: string;
}

export interface CommandKey extends KeyDefinitionCommon {
  readonly kind: "command";
  /** An editor command id (e.g. "undo", "editor.action.clipboardCopyAction"). */
  readonly commandId: string;
  readonly commandArgs?: readonly unknown[];
}

export interface SnippetKey extends KeyDefinitionCommon {
  readonly kind: "snippet";
  /** VS Code snippet syntax: ${1:placeholder} tab-stops, final $0 for the resting caret. */
  readonly template: string;
}

export interface SpacerKey extends KeyDefinitionCommon {
  readonly kind: "spacer";
}

export interface ShiftKey extends KeyDefinitionCommon {
  readonly kind: "shift";
}

export interface CapsLockKey extends KeyDefinitionCommon {
  readonly kind: "capsLock";
}

export type KeyDefinition = CharacterKey | LiteralKey | CommandKey | SnippetKey | SpacerKey | ShiftKey | CapsLockKey;

const DEFAULT_WIDTH = 1;

export function charKey(id: string, text: string, shiftText?: string, width = DEFAULT_WIDTH): CharacterKey {
  return { kind: "character", id, label: text, text, shiftText: shiftText ?? text.toUpperCase(), width };
}

export function literalKey(id: string, text: string, width = DEFAULT_WIDTH): LiteralKey {
  return { kind: "literal", id, label: text, text, width };
}

export function commandKey(
  id: string,
  label: string,
  commandId: string,
  commandArgs?: readonly unknown[],
  width = DEFAULT_WIDTH,
): CommandKey {
  return { kind: "command", id, label, commandId, commandArgs, width };
}

export function snippetKey(id: string, label: string, template: string, width = DEFAULT_WIDTH): SnippetKey {
  return { kind: "snippet", id, label, template, width };
}

export function blankKey(id: string, width = DEFAULT_WIDTH): SpacerKey {
  return { kind: "spacer", id, label: "", width };
}

export function shiftKey(id: string, label = "Shift", width = DEFAULT_WIDTH): ShiftKey {
  return { kind: "shift", id, label, width };
}

export function capsLockKey(id: string, label = "Caps", width = DEFAULT_WIDTH): CapsLockKey {
  return { kind: "capsLock", id, label, width };
}

/**
 * True when shiftText is a genuinely different symbol (not just the
 * uppercase of text) — e.g. "1"/"!" or "["/"{" — so the UI can show it as a
 * small secondary label like a physical keyboard. Plain letter keys
 * ("q"/"Q") don't need this.
 */
export function showDualLabel(key: KeyDefinition): boolean {
  return key.kind === "character" && key.shiftText !== key.text.toUpperCase();
}
