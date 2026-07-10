import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { searchStdlib } from "./stdlibIndex";
import type { RuleSetImports } from "./ruleSetTypes";

const rulesDir = path.join(__dirname, "..", "..", "codepad-rules");

function loadImports(fileName: string): RuleSetImports {
  return JSON.parse(fs.readFileSync(path.join(rulesDir, fileName), "utf8")).imports;
}

test("searchStdlib() with no query returns everything, capped at the limit", () => {
  const { stdlib } = loadImports("c.json");
  assert.equal(searchStdlib(stdlib).length, Math.min(stdlib.length, 20));
  assert.equal(searchStdlib(stdlib, "", 3).length, 3);
});

test("searchStdlib() matches on path", () => {
  const { stdlib } = loadImports("c.json");
  const results = searchStdlib(stdlib, "stdio");
  assert.ok(results.some((e) => e.path === "stdio.h"));
});

test("searchStdlib() matches on description even when the query isn't in the path or label", () => {
  const { stdlib } = loadImports("c.json");
  const results = searchStdlib(stdlib, "printf");
  assert.ok(results.some((e) => e.path === "stdio.h"), 'expected "printf" to find stdio.h via its description');
});

test("searchStdlib() is case-insensitive", () => {
  const { stdlib } = loadImports("java.json");
  const results = searchStdlib(stdlib, "SCANNER");
  assert.ok(results.some((e) => e.path === "java.util.Scanner"));
});

test("searchStdlib() works against the real kotlin.json stdlib index", () => {
  const { stdlib } = loadImports("kotlin.json");
  const results = searchStdlib(stdlib, "random");
  assert.ok(results.some((e) => e.path === "kotlin.random.Random"));
});
