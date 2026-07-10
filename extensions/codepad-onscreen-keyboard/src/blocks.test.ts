import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { blocksFromRuleSet, type RuleSetWithBlocks } from "./blocks";

const rulesDir = path.join(__dirname, "..", "..", "codepad-rules");

function loadRuleSet(fileName: string): RuleSetWithBlocks {
  return JSON.parse(fs.readFileSync(path.join(rulesDir, fileName), "utf8"));
}

test("blocksFromRuleSet() turns every rule-set block into a snippet key", () => {
  const cRules = loadRuleSet("c.json");
  const keys = blocksFromRuleSet(cRules);

  assert.equal(keys.length, cRules.blocks.length);
  for (const key of keys) {
    assert.equal(key.kind, "snippet");
  }

  const ifKey = keys.find((k) => k.id === "if");
  assert.ok(ifKey, 'expected c.json to define an "if" block');
  assert.equal(ifKey!.label, "if");
  assert.equal(ifKey!.template, cRules.blocks.find((b) => b.id === "if")!.template);
  assert.equal(ifKey!.width, 3.5);
});

test("blocksFromRuleSet() works against the real java.json and kotlin.json rule sets", () => {
  for (const fileName of ["java.json", "kotlin.json"]) {
    const ruleSet = loadRuleSet(fileName);
    const keys = blocksFromRuleSet(ruleSet);
    assert.equal(keys.length, ruleSet.blocks.length, `${fileName}: expected one key per block`);
    assert.ok(keys.length > 0, `${fileName}: expected at least one block`);
  }
});
