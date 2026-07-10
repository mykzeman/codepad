import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildImportStatement, parseImportPath, planImportInsertion } from "./importStatement";
import type { RuleSetImports } from "./ruleSetTypes";

const rulesDir = path.join(__dirname, "..", "..", "codepad-rules");

function loadImports(fileName: string): RuleSetImports {
  return JSON.parse(fs.readFileSync(path.join(rulesDir, fileName), "utf8")).imports;
}

test("buildImportStatement() renders each language's real syntax", () => {
  assert.equal(buildImportStatement(loadImports("c.json"), "stdio.h"), "#include <stdio.h>");
  assert.equal(buildImportStatement(loadImports("java.json"), "java.util.List"), "import java.util.List;");
  assert.equal(buildImportStatement(loadImports("kotlin.json"), "kotlin.collections.List"), "import kotlin.collections.List");
});

test("parseImportPath() round-trips with buildImportStatement() for all three languages", () => {
  for (const [fileName, samplePath] of [
    ["c.json", "stdio.h"],
    ["java.json", "java.util.List"],
    ["kotlin.json", "kotlin.collections.List"],
  ] as const) {
    const rules = loadImports(fileName);
    const statement = buildImportStatement(rules, samplePath);
    assert.equal(parseImportPath(rules, statement), samplePath, `round-trip failed for ${fileName}`);
  }
});

test("parseImportPath() returns undefined for a line that doesn't match the template", () => {
  const rules = loadImports("java.json");
  assert.equal(parseImportPath(rules, "package com.example;"), undefined);
});

test("parseImportPath() tolerates surrounding whitespace", () => {
  const rules = loadImports("c.json");
  assert.equal(parseImportPath(rules, "   #include <stdio.h>  "), "stdio.h");
});

test("planImportInsertion() reports alreadyPresent when the path is already imported", () => {
  const rules = loadImports("java.json");
  const existing = ["import java.util.List;", "import java.util.Map;"];

  const plan = planImportInsertion(rules, existing, "java.util.List");
  assert.deepEqual(plan, { alreadyPresent: true });
});

test("planImportInsertion() plans an append when the path isn't imported yet", () => {
  const rules = loadImports("java.json");
  const existing = ["import java.util.List;", "import java.util.Map;"];

  const plan = planImportInsertion(rules, existing, "java.util.Scanner");
  assert.deepEqual(plan, {
    alreadyPresent: false,
    statement: "import java.util.Scanner;",
    insertIndex: 2,
  });
});

test("planImportInsertion() plans insertIndex 0 for a file with no existing imports", () => {
  const rules = loadImports("c.json");
  const plan = planImportInsertion(rules, [], "stdio.h");
  assert.deepEqual(plan, {
    alreadyPresent: false,
    statement: "#include <stdio.h>",
    insertIndex: 0,
  });
});
