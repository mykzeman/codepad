/**
 * Per-project symbol registry: the "reference later without retyping"
 * half of the feature. This is the hand-rolled fallback the plan calls
 * for — once the extension host and real language servers exist, lookups
 * should prefer resolving against the LSP's own symbol index where a
 * language has one, and fall back to this registry where it doesn't (or
 * for symbols the wizard created that the language server hasn't
 * reanalyzed yet).
 */

export interface RegisteredSymbol {
  readonly id: string;
  readonly name: string;
  readonly kindId: string;
  readonly languageId: string;
  readonly type?: string;
  /** Declaring file path, or a project-wide scope identifier for symbols not tied to one file. */
  readonly scope: string;
  readonly declaration: string;
  readonly createdAt: number;
}

export type NewSymbol = Omit<RegisteredSymbol, "id" | "createdAt">;

export interface SymbolQuery {
  readonly languageId?: string;
  readonly kindId?: string;
  readonly scope?: string;
  /** Case-insensitive substring match against the symbol's name. */
  readonly text?: string;
}

function generateId(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `sym_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export class SymbolRegistry {
  private readonly symbols: RegisteredSymbol[] = [];

  constructor(private readonly now: () => number = Date.now) {}

  register(symbol: NewSymbol): RegisteredSymbol {
    const registered: RegisteredSymbol = { ...symbol, id: generateId(), createdAt: this.now() };
    this.symbols.push(registered);
    return registered;
  }

  all(): readonly RegisteredSymbol[] {
    return this.symbols.slice();
  }

  /** Filtered by kind/scope/language and a name substring, most recently created first. */
  search(query: SymbolQuery = {}, limit = 20): RegisteredSymbol[] {
    const lowerText = query.text?.toLowerCase();

    return this.symbols
      .filter((s) => (query.languageId ? s.languageId === query.languageId : true))
      .filter((s) => (query.kindId ? s.kindId === query.kindId : true))
      .filter((s) => (query.scope ? s.scope === query.scope : true))
      .filter((s) => (lowerText ? s.name.toLowerCase().includes(lowerText) : true))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}
