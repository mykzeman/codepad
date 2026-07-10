import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { wizardSteps, validateSelections } from "./wizard";
import type { RuleSetSymbolKind } from "./ruleSetTypes";

const rulesDir = path.join(__dirname, "..", "..", "codepad-rules");

function loadSymbolKind(fileName: string, kindId: string): RuleSetSymbolKind {
  const ruleSet = JSON.parse(fs.readFileSync(path.join(rulesDir, fileName), "utf8"));
  const kind = ruleSet.symbolKinds.find((k: RuleSetSymbolKind) => k.id === kindId);
  assert.ok(kind, `expected ${fileName} to define a "${kindId}" symbol kind`);
  return kind;
}

test("wizardSteps() orders modifier groups before type before name", () => {
  const javaField = loadSymbolKind("java.json", "field");
  const steps = wizardSteps(javaField);

  assert.equal(steps.length, 4);
  assert.equal(steps[0].kind, "modifierGroup");
  assert.equal(steps[1].kind, "modifierGroup");
  assert.equal(steps[2].kind, "type");
  assert.equal(steps[3].kind, "name");
});

test("wizardSteps() omits the type step for kinds with no types (C's struct)", () => {
  const cStruct = loadSymbolKind("c.json", "struct");
  const steps = wizardSteps(cStruct);

  assert.equal(steps.some((s) => s.kind === "type"), false);
  assert.equal(steps[steps.length - 1].kind, "name");
});

test("validateSelections() requires exactly one choice for single-select groups", () => {
  const javaField = loadSymbolKind("java.json", "field");

  const missing = validateSelections(javaField, { name: "count", type: "int" });
  assert.ok(missing.some((e) => e.includes("Visibility")));

  const complete = validateSelections(javaField, {
    modifiers: { visibility: ["private"], qualifiers: [] },
    type: "int",
    name: "count",
  });
  assert.deepEqual(complete, []);
});

test("validateSelections() allows zero selections for multiple-select groups", () => {
  const javaField = loadSymbolKind("java.json", "field");

  const errors = validateSelections(javaField, {
    modifiers: { visibility: ["public"], qualifiers: [] },
    type: "int",
    name: "count",
  });

  assert.deepEqual(errors, []);
});

test("validateSelections() rejects an unknown option id", () => {
  const javaField = loadSymbolKind("java.json", "field");

  const errors = validateSelections(javaField, {
    modifiers: { visibility: ["nonexistent"], qualifiers: [] },
    type: "int",
    name: "count",
  });

  assert.ok(errors.some((e) => e.includes("nonexistent")));
});

test("validateSelections() requires a type when the kind lists any, and requires a name always", () => {
  const javaField = loadSymbolKind("java.json", "field");

  const noType = validateSelections(javaField, {
    modifiers: { visibility: ["public"], qualifiers: [] },
    name: "count",
  });
  assert.ok(noType.some((e) => e.includes("type")));

  const noName = validateSelections(javaField, {
    modifiers: { visibility: ["public"], qualifiers: [] },
    type: "int",
    name: "  ",
  });
  assert.ok(noName.some((e) => e.includes("name")));
});
