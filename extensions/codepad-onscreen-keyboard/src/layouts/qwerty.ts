import { charKey, commandKey, literalKey, capsLockKey, shiftKey, blankKey, type KeyDefinition } from "../keyDefinition";

/**
 * The main alphanumeric block, rows top-to-bottom. Ported from the old
 * WPF app's KeyboardLayouts.Qwerty, with Backspace/Tab/Enter/Space
 * recast as editor commands instead of VirtualKey presses (see
 * keyDefinition.ts for why).
 */
export const QWERTY_ROWS: readonly (readonly KeyDefinition[])[] = [
  [
    charKey("tilde", "`", "~"),
    charKey("digit1", "1", "!"),
    charKey("digit2", "2", "@"),
    charKey("digit3", "3", "#"),
    charKey("digit4", "4", "$"),
    charKey("digit5", "5", "%"),
    charKey("digit6", "6", "^"),
    charKey("digit7", "7", "&"),
    charKey("digit8", "8", "*"),
    charKey("digit9", "9", "("),
    charKey("digit0", "0", ")"),
    charKey("minus", "-", "_"),
    charKey("equals", "=", "+"),
    commandKey("backspace", "Backspace", "deleteLeft", undefined, 2),
  ],
  [
    commandKey("tab", "Tab", "tab", undefined, 1.5),
    charKey("q", "q"), charKey("w", "w"), charKey("e", "e"),
    charKey("r", "r"), charKey("t", "t"), charKey("y", "y"),
    charKey("u", "u"), charKey("i", "i"), charKey("o", "o"),
    charKey("p", "p"),
    charKey("bracketOpen", "[", "{"),
    charKey("bracketClose", "]", "}"),
    charKey("backslash", "\\", "|", 1.5),
  ],
  [
    capsLockKey("caps", "Caps", 1.75),
    charKey("a", "a"), charKey("s", "s"), charKey("d", "d"),
    charKey("f", "f"), charKey("g", "g"), charKey("h", "h"),
    charKey("j", "j"), charKey("k", "k"), charKey("l", "l"),
    charKey("semicolon", ";", ":"),
    charKey("quote", "'", "\""),
    commandKey("enter", "Enter", "type", [{ text: "\n" }], 2.25),
  ],
  [
    shiftKey("shiftLeft", "Shift", 2.25),
    charKey("z", "z"), charKey("x", "x"), charKey("c", "c"),
    charKey("v", "v"), charKey("b", "b"), charKey("n", "n"),
    charKey("m", "m"),
    charKey("comma", ",", "<"),
    charKey("period", ".", ">"),
    charKey("slash", "/", "?"),
    shiftKey("shiftRight", "Shift", 2.25),
  ],
  [
    literalKey("space", " ", 15),
  ],
];

/**
 * Nav cluster shown as a side column. Ported from QwertyNav, minus
 * Insert/PrintScreen/ScrollLock/Pause/Escape — none of those have a
 * sensible editor-command equivalent now that keys map to named editor
 * commands instead of raw VK presses forwarded to whatever app has focus.
 */
export const QWERTY_NAV_ROWS: readonly (readonly KeyDefinition[])[] = [
  [commandKey("home", "Home", "cursorHome", undefined, 2.5), commandKey("pgup", "PgUp", "cursorPageUp", undefined, 2.5)],
  [commandKey("end", "End", "cursorEnd", undefined, 2.5), commandKey("pgdn", "PgDn", "cursorPageDown", undefined, 2.5)],
  [commandKey("delete", "Delete", "deleteRight", undefined, 2.5)],
];

/** Arrow cluster in the classic inverted-T formation. Ported from QwertyArrows. */
export const QWERTY_ARROW_ROWS: readonly (readonly KeyDefinition[])[] = [
  [
    blankKey("arrowGapUp1", 2),
    commandKey("arrowUp", "↑", "cursorUp", undefined, 2),
    blankKey("arrowGapUp2", 2),
  ],
  [
    commandKey("arrowLeft", "←", "cursorLeft", undefined, 2),
    commandKey("arrowDown", "↓", "cursorDown", undefined, 2),
    commandKey("arrowRight", "→", "cursorRight", undefined, 2),
  ],
];
