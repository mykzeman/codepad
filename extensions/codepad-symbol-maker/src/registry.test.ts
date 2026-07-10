import test from "node:test";
import assert from "node:assert/strict";
import { SymbolRegistry } from "./registry";

function fakeClock(): () => number {
  let t = 0;
  return () => t++;
}

test("register() assigns an id and createdAt, and all() returns everything registered", () => {
  const registry = new SymbolRegistry(fakeClock());
  const symbol = registry.register({
    name: "count",
    kindId: "variable",
    languageId: "c",
    type: "int",
    scope: "main.c",
    declaration: "int count;",
  });

  assert.ok(symbol.id.length > 0);
  assert.equal(symbol.createdAt, 0);
  assert.equal(registry.all().length, 1);
});

test("search() filters by languageId, kindId, and scope", () => {
  const registry = new SymbolRegistry(fakeClock());
  registry.register({ name: "count", kindId: "variable", languageId: "c", scope: "main.c", declaration: "int count;" });
  registry.register({ name: "total", kindId: "variable", languageId: "java", scope: "Main.java", declaration: "int total;" });
  registry.register({ name: "run", kindId: "function", languageId: "c", scope: "main.c", declaration: "void run(void) {}" });

  assert.equal(registry.search({ languageId: "c" }).length, 2);
  assert.equal(registry.search({ kindId: "function" }).length, 1);
  assert.equal(registry.search({ scope: "Main.java" }).length, 1);
});

test("search() filters by a case-insensitive name substring", () => {
  const registry = new SymbolRegistry(fakeClock());
  registry.register({ name: "totalCount", kindId: "variable", languageId: "c", scope: "main.c", declaration: "int totalCount;" });
  registry.register({ name: "run", kindId: "function", languageId: "c", scope: "main.c", declaration: "void run(void) {}" });

  const results = registry.search({ text: "COUNT" });
  assert.equal(results.length, 1);
  assert.equal(results[0].name, "totalCount");
});

test("search() orders most recently registered first and respects the limit", () => {
  const registry = new SymbolRegistry(fakeClock());
  registry.register({ name: "first", kindId: "variable", languageId: "c", scope: "main.c", declaration: "int first;" });
  registry.register({ name: "second", kindId: "variable", languageId: "c", scope: "main.c", declaration: "int second;" });
  registry.register({ name: "third", kindId: "variable", languageId: "c", scope: "main.c", declaration: "int third;" });

  const results = registry.search({}, 2);
  assert.deepEqual(results.map((s) => s.name), ["third", "second"]);
});
