import test from "node:test";
import assert from "node:assert/strict";
import { charKey, literalKey, commandKey, snippetKey, blankKey, shiftKey, capsLockKey, showDualLabel } from "./keyDefinition";

test("charKey() defaults shiftText to the uppercased base text", () => {
  const key = charKey("q", "q");
  assert.equal(key.text, "q");
  assert.equal(key.shiftText, "Q");
  assert.equal(key.width, 1);
});

test("charKey() accepts an explicit shiftText for symbol keys", () => {
  const key = charKey("digit1", "1", "!");
  assert.equal(key.shiftText, "!");
});

test("showDualLabel() is false for plain letters and true for symbol keys", () => {
  assert.equal(showDualLabel(charKey("q", "q")), false);
  assert.equal(showDualLabel(charKey("digit1", "1", "!")), true);
});

test("showDualLabel() is false for non-character keys", () => {
  assert.equal(showDualLabel(literalKey("eq", "==")), false);
  assert.equal(showDualLabel(commandKey("undo", "Undo", "undo")), false);
});

test("literalKey() carries its text as both id-independent label and text", () => {
  const key = literalKey("eq", "==", 3);
  assert.equal(key.kind, "literal");
  assert.equal(key.label, "==");
  assert.equal(key.width, 3);
});

test("commandKey() carries an optional args array through", () => {
  const key = commandKey("selectWord", "Select Word", "cursorWordRightSelect", [{ example: true }]);
  assert.equal(key.commandId, "cursorWordRightSelect");
  assert.deepEqual(key.commandArgs, [{ example: true }]);
});

test("snippetKey() and blankKey() set their kind correctly", () => {
  assert.equal(snippetKey("if", "if", "if (${1:x}) {\n    $0\n}").kind, "snippet");
  assert.equal(blankKey("gap", 2).kind, "spacer");
});

test("shiftKey() and capsLockKey() default their labels", () => {
  assert.equal(shiftKey("shift-left").label, "Shift");
  assert.equal(capsLockKey("caps").label, "Caps");
});
