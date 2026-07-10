import test from "node:test";
import assert from "node:assert/strict";
import { PredictionEngine, type WordStore } from "./predictionEngine";

test("getSuggestions() returns nothing for an empty prefix", () => {
  const engine = new PredictionEngine(["apple"]);
  assert.deepEqual(engine.getSuggestions(""), []);
});

test("getSuggestions() prefix-matches case-insensitively and ties break alphabetically", () => {
  const engine = new PredictionEngine(["apple", "apricot"]);
  assert.deepEqual(engine.getSuggestions("AP"), ["apple", "apricot"]);
});

test("recordUsage() bumps frequency and re-ranks suggestions", () => {
  const engine = new PredictionEngine(["apple", "apricot"]);
  engine.recordUsage("apricot");
  engine.recordUsage("apricot");
  engine.recordUsage("apricot");

  assert.deepEqual(engine.getSuggestions("ap"), ["apricot", "apple"]);
});

test("recordUsage() ignores empty, whitespace-only, and single-character words", () => {
  const saved: Record<string, number>[] = [];
  const store: WordStore = {
    load: () => undefined,
    save: (frequency) => saved.push(frequency),
  };
  const engine = new PredictionEngine([], store);

  engine.recordUsage("");
  engine.recordUsage("   ");
  engine.recordUsage("a");

  assert.deepEqual(engine.getSuggestions("a"), []);
  assert.equal(saved.length, 0);
});

test("getSuggestions() respects the count parameter", () => {
  const engine = new PredictionEngine(["cat", "car", "can", "cap"]);
  assert.equal(engine.getSuggestions("ca", 2).length, 2);
});

test("a custom WordStore seeds frequency on construction and receives merged saves", () => {
  const store: WordStore = {
    load: () => ({ custom: 5 }),
    save: () => {},
  };
  const engine = new PredictionEngine([], store);

  assert.deepEqual(engine.getSuggestions("cu"), ["custom"]);

  let lastSaved: Record<string, number> = {};
  const capturingStore: WordStore = {
    load: () => ({ custom: 5 }),
    save: (frequency) => {
      lastSaved = frequency;
    },
  };
  const engine2 = new PredictionEngine([], capturingStore);
  engine2.recordUsage("custom");

  assert.equal(lastSaved.custom, 6);
});
