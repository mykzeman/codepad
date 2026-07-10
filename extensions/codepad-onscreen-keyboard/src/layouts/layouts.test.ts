import test from "node:test";
import assert from "node:assert/strict";
import { QWERTY_ROWS, QWERTY_NAV_ROWS, QWERTY_ARROW_ROWS } from "./qwerty";
import { OPERATOR_ROWS } from "./mathLogic";
import { MISC_ROWS } from "./misc";
import type { KeyDefinition } from "../keyDefinition";

function flatten(rows: readonly (readonly KeyDefinition[])[]): KeyDefinition[] {
  return rows.flat();
}

function assertUniqueIds(keys: readonly KeyDefinition[], where: string) {
  const ids = keys.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length, `${where}: expected all key ids to be unique, got [${ids.join(", ")}]`);
}

test("QWERTY_ROWS has unique ids and a full alphabet", () => {
  const keys = flatten(QWERTY_ROWS);
  assertUniqueIds(keys, "QWERTY_ROWS");

  const letters = "abcdefghijklmnopqrstuvwxyz".split("");
  for (const letter of letters) {
    assert.ok(keys.some((k) => k.id === letter && k.kind === "character"), `expected a character key for "${letter}"`);
  }
});

test("QWERTY_ROWS + QWERTY_NAV_ROWS + QWERTY_ARROW_ROWS have no id collisions when shown together", () => {
  const allKeys = [...flatten(QWERTY_ROWS), ...flatten(QWERTY_NAV_ROWS), ...flatten(QWERTY_ARROW_ROWS)];
  assertUniqueIds(allKeys, "combined QWERTY panel");
});

test("QWERTY_NAV_ROWS and QWERTY_ARROW_ROWS keys are all commands or spacers", () => {
  for (const key of [...flatten(QWERTY_NAV_ROWS), ...flatten(QWERTY_ARROW_ROWS)]) {
    assert.ok(key.kind === "command" || key.kind === "spacer", `expected "${key.id}" to be a command or spacer, got "${key.kind}"`);
    if (key.kind === "command") {
      assert.ok(key.commandId.length > 0, `expected "${key.id}" to have a non-empty commandId`);
    }
  }
});

test("OPERATOR_ROWS are all literal keys with unique ids", () => {
  const keys = flatten(OPERATOR_ROWS);
  assertUniqueIds(keys, "OPERATOR_ROWS");
  for (const key of keys) {
    assert.equal(key.kind, "literal");
  }
});

test("MISC_ROWS are all command keys with unique ids and non-empty commandIds", () => {
  const keys = flatten(MISC_ROWS);
  assertUniqueIds(keys, "MISC_ROWS");
  for (const key of keys) {
    assert.equal(key.kind, "command");
    if (key.kind === "command") {
      assert.ok(key.commandId.length > 0, `expected "${key.id}" to have a non-empty commandId`);
    }
  }
});
