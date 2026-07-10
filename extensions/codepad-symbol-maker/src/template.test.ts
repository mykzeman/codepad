import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { renderDeclaration } from "./template";
import type { RuleSetSymbolKind } from "./ruleSetTypes";

const rulesDir = path.join(__dirname, "..", "..", "codepad-rules");

function loadSymbolKind(fileName: string, kindId: string): RuleSetSymbolKind {
  const ruleSet = JSON.parse(fs.readFileSync(path.join(rulesDir, fileName), "utf8"));
  const kind = ruleSet.symbolKinds.find((k: RuleSetSymbolKind) => k.id === kindId);
  assert.ok(kind, `expected ${fileName} to define a "${kindId}" symbol kind`);
  return kind;
}

test("renders a C variable with multiple storage qualifiers", () => {
  const cVariable = loadSymbolKind("c.json", "variable");
  const result = renderDeclaration(cVariable, {
    modifiers: { storage: ["static", "const"] },
    type: "int",
    name: "count",
  });
  assert.equal(result, "static const int count;");
});

test("renders a C function with the (none) storage option as empty text", () => {
  const cFunction = loadSymbolKind("c.json", "function");
  const result = renderDeclaration(cFunction, {
    modifiers: { storage: ["none"] },
    type: "void",
    name: "doThing",
  });
  assert.equal(result, "void doThing(void) {\n    $0\n}");
});

test("renders a C struct with no modifiers or type", () => {
  const cStruct = loadSymbolKind("c.json", "struct");
  const result = renderDeclaration(cStruct, { name: "Point" });
  assert.equal(result, "struct Point {\n    $0\n};");
});

test("renders a Java field with two modifier groups", () => {
  const javaField = loadSymbolKind("java.json", "field");
  const result = renderDeclaration(javaField, {
    modifiers: { visibility: ["private"], qualifiers: ["static", "final"] },
    type: "int",
    name: "counter",
  });
  assert.equal(result, "private static final int counter;");
});

test("renders a Kotlin variable using its declaration (val/var) modifier", () => {
  const kotlinVariable = loadSymbolKind("kotlin.json", "variable");
  const result = renderDeclaration(kotlinVariable, {
    modifiers: { declaration: ["val"] },
    type: "Int",
    name: "total",
  });
  assert.equal(result, "val total: Int");
});

test("renders a Kotlin property with the default (empty-text) visibility option", () => {
  const kotlinProperty = loadSymbolKind("kotlin.json", "property");
  const result = renderDeclaration(kotlinProperty, {
    modifiers: { visibility: ["public"], declaration: ["var"] },
    type: "Int",
    name: "score",
  });
  assert.equal(result, "var score: Int");
});

test("renders a Kotlin class with visibility and a qualifier", () => {
  const kotlinClass = loadSymbolKind("kotlin.json", "class");
  const result = renderDeclaration(kotlinClass, {
    modifiers: { visibility: ["internal"], qualifiers: ["open"] },
    name: "Point",
  });
  assert.equal(result, "internal open class Point {\n    $0\n}");
});

test("throws with validation errors when selections are incomplete", () => {
  const javaField = loadSymbolKind("java.json", "field");
  assert.throws(
    () => renderDeclaration(javaField, { type: "int", name: "counter" }),
    /Cannot render declaration/,
  );
});

test("throws if a template references a placeholder no group/type/name covers", () => {
  const brokenKind: RuleSetSymbolKind = {
    id: "broken",
    label: "Broken",
    template: "{bogus} {name}",
  };
  assert.throws(() => renderDeclaration(brokenKind, { name: "x" }), /unresolved placeholder/);
});
