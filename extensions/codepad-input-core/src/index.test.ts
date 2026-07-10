import test from "node:test";
import assert from "node:assert/strict";
import { ActivationRegistry, bindPointerActivation } from "./index";

test("activate() calls the registered element and notifies listeners", () => {
  const registry = new ActivationRegistry();
  let activated = false;
  registry.register({ id: "a", label: "A", activate: () => { activated = true; } });

  let notified: string | undefined;
  registry.onActivate((id) => { notified = id; });

  registry.activate("a");

  assert.equal(activated, true);
  assert.equal(notified, "a");
});

test("activate() throws for an unregistered id", () => {
  const registry = new ActivationRegistry();
  assert.throws(() => registry.activate("missing"));
});

test("register() throws on duplicate ids", () => {
  const registry = new ActivationRegistry();
  registry.register({ id: "a", label: "A", activate: () => {} });
  assert.throws(() => registry.register({ id: "a", label: "A2", activate: () => {} }));
});

test("scanOrder() reflects registration order and survives unregister", () => {
  const registry = new ActivationRegistry();
  registry.register({ id: "a", label: "A", activate: () => {} });
  registry.register({ id: "b", label: "B", activate: () => {} });
  registry.register({ id: "c", label: "C", activate: () => {} });

  assert.deepEqual(registry.scanOrder(), ["a", "b", "c"]);

  registry.unregister("b");
  assert.deepEqual(registry.scanOrder(), ["a", "c"]);
});

test("onActivate() unsubscribe stops further notifications", () => {
  const registry = new ActivationRegistry();
  registry.register({ id: "a", label: "A", activate: () => {} });

  let notifications = 0;
  const unsubscribe = registry.onActivate(() => { notifications += 1; });

  registry.activate("a");
  unsubscribe();
  registry.activate("a");

  assert.equal(notifications, 1);
});

test("bindPointerActivation wires a click straight into activate()", () => {
  const registry = new ActivationRegistry();
  let activated = false;
  registry.register({ id: "a", label: "A", activate: () => { activated = true; } });

  const handlers: Record<string, () => void> = {};
  const fakeTarget = {
    addEventListener(type: string, handler: () => void) {
      handlers[type] = handler;
    },
  };

  bindPointerActivation(fakeTarget, registry, "a");
  handlers.click();

  assert.equal(activated, true);
});
