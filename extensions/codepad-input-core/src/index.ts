/**
 * The load-bearing abstraction for every Codepad panel: instead of wiring a
 * click handler straight to an action, panels register an ActivatableElement
 * with a registry and let the registry's activate() call fire the action.
 *
 * MVP only drives that through pointer clicks (see bindPointerActivation
 * below), but every panel already goes through activate() and exposes a
 * linear scanOrder() of its elements. Switch scanning (row/column
 * auto-highlight + one mapped key) and dwell-click (activate after the
 * pointer rests on a target) are both just alternate callers of the same
 * activate(elementId) entry point, layered on later without requiring the
 * keyboard/symbol-maker/module-reference panels to be redesigned.
 */

export interface ActivatableElement {
  readonly id: string;
  readonly label: string;
  activate(): void;
}

export type ActivationListener = (elementId: string) => void;

export class ActivationRegistry {
  private readonly elements = new Map<string, ActivatableElement>();
  private readonly order: string[] = [];
  private readonly listeners = new Set<ActivationListener>();

  register(element: ActivatableElement): void {
    if (this.elements.has(element.id)) {
      throw new Error(`Element "${element.id}" is already registered.`);
    }
    this.elements.set(element.id, element);
    this.order.push(element.id);
  }

  unregister(elementId: string): void {
    this.elements.delete(elementId);
    const index = this.order.indexOf(elementId);
    if (index !== -1) {
      this.order.splice(index, 1);
    }
  }

  clear(): void {
    this.elements.clear();
    this.order.length = 0;
  }

  has(elementId: string): boolean {
    return this.elements.has(elementId);
  }

  /** The order elements were registered in — the order a future scan-based input method will traverse. */
  scanOrder(): readonly string[] {
    return this.order.slice();
  }

  /**
   * The single entry point every input method funnels through. Panels never
   * call an element's activate() directly; they call this, so anything that
   * needs to observe every activation (analytics, prediction tracking, a
   * future scan-mode highlighter) only has to hook one place.
   */
  activate(elementId: string): void {
    const element = this.elements.get(elementId);
    if (!element) {
      throw new Error(`No element registered with id "${elementId}".`);
    }
    element.activate();
    for (const listener of this.listeners) {
      listener(elementId);
    }
  }

  onActivate(listener: ActivationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

/** Minimal subset of DOM/webview EventTarget this package depends on, so it has no lib.dom dependency. */
export interface ClickTarget {
  addEventListener(type: "click", handler: () => void): void;
}

/**
 * The only pointer-specific code in this package: wires a click on `target`
 * straight into the registry's activate() call. Every panel's key/button
 * elements are bound through this rather than handling clicks themselves.
 */
export function bindPointerActivation(target: ClickTarget, registry: ActivationRegistry, elementId: string): void {
  target.addEventListener("click", () => registry.activate(elementId));
}
