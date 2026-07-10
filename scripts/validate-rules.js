#!/usr/bin/env node
// Validates every extensions/codepad-rules/*.json file against the shape
// required by schema/language-rules.schema.json. Deliberately dependency-free
// (no ajv) since this repo has no package.json/toolchain yet.

const fs = require("fs");
const path = require("path");

const rulesDir = path.join(__dirname, "..", "extensions", "codepad-rules");

function fail(errors, msg) {
  errors.push(msg);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

function validateModifierGroup(group, where, errors) {
  if (!isNonEmptyString(group.id)) fail(errors, `${where}.id must be a non-empty string`);
  if (!isNonEmptyString(group.label)) fail(errors, `${where}.label must be a non-empty string`);
  if (group.multiple !== undefined && typeof group.multiple !== "boolean") {
    fail(errors, `${where}.multiple must be a boolean if present`);
  }
  if (!Array.isArray(group.options) || group.options.length === 0) {
    fail(errors, `${where}.options must be a non-empty array`);
    return;
  }
  group.options.forEach((opt, i) => {
    const w = `${where}.options[${i}]`;
    if (!isNonEmptyString(opt.id)) fail(errors, `${w}.id must be a non-empty string`);
    if (!isNonEmptyString(opt.label)) fail(errors, `${w}.label must be a non-empty string`);
    if (typeof opt.text !== "string") fail(errors, `${w}.text must be a string`);
  });
}

function validateRuleSet(fileName, data) {
  const errors = [];

  const requiredTop = ["languageId", "displayName", "fileExtensions", "indentation", "blocks", "symbolKinds", "imports"];
  for (const key of requiredTop) {
    if (!(key in data)) fail(errors, `missing required top-level field "${key}"`);
  }

  if (!isNonEmptyString(data.languageId)) fail(errors, "languageId must be a non-empty string");
  if (!isNonEmptyString(data.displayName)) fail(errors, "displayName must be a non-empty string");

  if (!Array.isArray(data.fileExtensions) || data.fileExtensions.length === 0) {
    fail(errors, "fileExtensions must be a non-empty array");
  } else {
    data.fileExtensions.forEach((ext, i) => {
      if (!isNonEmptyString(ext) || !ext.startsWith(".")) {
        fail(errors, `fileExtensions[${i}] must be a string starting with "."`);
      }
    });
  }

  if (data.indentation !== "brace" && data.indentation !== "indentation") {
    fail(errors, 'indentation must be "brace" or "indentation"');
  }

  if (!Array.isArray(data.blocks)) {
    fail(errors, "blocks must be an array");
  } else {
    data.blocks.forEach((block, i) => {
      const where = `blocks[${i}]`;
      if (!isNonEmptyString(block.id)) fail(errors, `${where}.id must be a non-empty string`);
      if (!isNonEmptyString(block.label)) fail(errors, `${where}.label must be a non-empty string`);
      if (!isNonEmptyString(block.template)) fail(errors, `${where}.template must be a non-empty string`);
    });
  }

  if (!Array.isArray(data.symbolKinds)) {
    fail(errors, "symbolKinds must be an array");
  } else {
    data.symbolKinds.forEach((kind, i) => {
      const where = `symbolKinds[${i}]`;
      if (!isNonEmptyString(kind.id)) fail(errors, `${where}.id must be a non-empty string`);
      if (!isNonEmptyString(kind.label)) fail(errors, `${where}.label must be a non-empty string`);
      if (!isNonEmptyString(kind.template)) fail(errors, `${where}.template must be a non-empty string`);
      if (kind.types !== undefined) {
        if (!Array.isArray(kind.types) || !kind.types.every(isNonEmptyString)) {
          fail(errors, `${where}.types must be an array of non-empty strings if present`);
        }
      }
      if (kind.modifiers !== undefined) {
        if (!Array.isArray(kind.modifiers)) {
          fail(errors, `${where}.modifiers must be an array if present`);
        } else {
          kind.modifiers.forEach((group, j) => validateModifierGroup(group, `${where}.modifiers[${j}]`, errors));
        }
      }
    });
  }

  if (typeof data.imports !== "object" || data.imports === null) {
    fail(errors, "imports must be an object");
  } else {
    const imp = data.imports;
    if (!isNonEmptyString(imp.statementTemplate) || !imp.statementTemplate.includes("{path}")) {
      fail(errors, 'imports.statementTemplate must be a non-empty string containing "{path}"');
    }
    if (imp.insertPosition !== "top-of-file" && imp.insertPosition !== "after-existing-imports") {
      fail(errors, 'imports.insertPosition must be "top-of-file" or "after-existing-imports"');
    }
    if (!Array.isArray(imp.stdlib)) {
      fail(errors, "imports.stdlib must be an array");
    } else {
      imp.stdlib.forEach((entry, i) => {
        const where = `imports.stdlib[${i}]`;
        if (!isNonEmptyString(entry.path)) fail(errors, `${where}.path must be a non-empty string`);
        if (!isNonEmptyString(entry.label)) fail(errors, `${where}.label must be a non-empty string`);
      });
    }
  }

  return errors;
}

function main() {
  const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith(".json"));

  if (files.length === 0) {
    console.error(`No rule-set JSON files found in ${rulesDir}`);
    process.exit(1);
  }

  let anyFailed = false;

  for (const file of files) {
    const fullPath = path.join(rulesDir, file);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    } catch (e) {
      console.error(`FAIL ${file}: invalid JSON (${e.message})`);
      anyFailed = true;
      continue;
    }

    const errors = validateRuleSet(file, data);
    if (errors.length > 0) {
      anyFailed = true;
      console.error(`FAIL ${file}:`);
      for (const err of errors) console.error(`  - ${err}`);
    } else {
      console.log(`OK   ${file}`);
    }
  }

  process.exit(anyFailed ? 1 : 0);
}

main();
