import { SEED_WORDS } from "./seedWords";

/**
 * Persistence for the frequency table, abstracted the same way input-core
 * abstracts pointer events — this package has no filesystem/vscode
 * dependency of its own. A real store backed by the extension host's
 * ExtensionContext.globalState gets wired in once the extension exists;
 * NullWordStore keeps the engine fully usable (just non-persistent) until
 * then.
 */
export interface WordStore {
  load(): Record<string, number> | undefined;
  save(frequency: Record<string, number>): void;
}

export class NullWordStore implements WordStore {
  load(): Record<string, number> | undefined {
    return undefined;
  }
  save(): void {
    // Intentionally discarded.
  }
}

/**
 * Frequency-ranked word prediction, ported from the old WPF app's
 * PredictionEngine. Every word ever passed to recordUsage() there was
 * already lowercased by the caller (MainWindow tracked keystrokes as
 * `char.ToLowerInvariant(glyph[0])`), so the original's case-insensitive
 * dictionary lookup and this port's plain lowercased Map key are
 * behaviorally equivalent — simpler here since there's no built-in
 * case-insensitive Map in JS to reach for instead.
 */
export class PredictionEngine {
  private readonly frequency = new Map<string, number>();

  constructor(
    seedWords: readonly string[] = SEED_WORDS,
    private readonly store: WordStore = new NullWordStore(),
  ) {
    for (const word of seedWords) {
      const key = word.toLowerCase();
      if (!this.frequency.has(key)) {
        this.frequency.set(key, 1);
      }
    }
    this.loadLearned();
  }

  getSuggestions(prefix: string, count = 3): string[] {
    if (!prefix) {
      return [];
    }

    const lowerPrefix = prefix.toLowerCase();
    return [...this.frequency.entries()]
      .filter(([word]) => word.startsWith(lowerPrefix))
      .sort(([wordA, freqA], [wordB, freqB]) => freqB - freqA || wordA.localeCompare(wordB))
      .slice(0, count)
      .map(([word]) => word);
  }

  recordUsage(word: string): void {
    if (!word || word.trim().length === 0 || word.length < 2) {
      return;
    }

    const key = word.toLowerCase();
    this.frequency.set(key, (this.frequency.get(key) ?? 0) + 1);
    this.save();
  }

  private loadLearned(): void {
    const learned = this.store.load();
    if (!learned) {
      return;
    }
    for (const [word, count] of Object.entries(learned)) {
      this.frequency.set(word.toLowerCase(), count);
    }
  }

  private save(): void {
    this.store.save(Object.fromEntries(this.frequency));
  }
}
