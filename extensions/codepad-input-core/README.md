# @codepad/input-core

The shared selection/activation model every Codepad panel (on-screen
keyboard, symbol maker, module reference editor) is built against.

MVP ships pointer-only, but every panel registers its clickable elements
with an `ActivationRegistry` and routes clicks through `activate(elementId)`
rather than handling them directly. That's what lets switch scanning
(row/column auto-highlight + one mapped key) and dwell-click (activate after
the pointer rests on a target) get added later as alternate callers of the
same `activate()` entry point, instead of requiring each panel to be
redesigned when those input methods are built.

## API

- `ActivationRegistry` — register/unregister `ActivatableElement`s, call
  `activate(id)` to fire one, subscribe to every activation via
  `onActivate(listener)`, and read the registration order via `scanOrder()`
  (unused until switch scanning exists, but every panel must maintain it from
  the start — retrofitting a scan order into an already-built panel is real
  rework).
- `bindPointerActivation(target, registry, elementId)` — the only
  pointer-specific code in this package; wires a DOM/webview `click` straight
  into `registry.activate(elementId)`.

## Development

```
npm run build   # tsc -b
npm test        # build, then run the node:test suite in dist/
```
