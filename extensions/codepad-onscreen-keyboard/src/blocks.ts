import { snippetKey, type SnippetKey } from "./keyDefinition";

/** The subset of a codepad-rules language file this module actually reads. */
export interface RuleSetBlock {
  readonly id: string;
  readonly label: string;
  readonly template: string;
}

export interface RuleSetWithBlocks {
  readonly blocks: readonly RuleSetBlock[];
}

/** Matches the old BlockLayouts.cs button width — wide enough for labels like "if / else". */
const BLOCK_KEY_WIDTH = 3.5;

/**
 * Builds the Blocks panel for whatever language rule set is active. This is
 * the one piece of the on-screen keyboard driven entirely by codepad-rules
 * rather than hardcoded per language — swapping the active file's language
 * swaps the rule set passed in here, nothing else changes.
 */
export function blocksFromRuleSet(ruleSet: RuleSetWithBlocks): SnippetKey[] {
  return ruleSet.blocks.map((block) => snippetKey(block.id, block.label, block.template, BLOCK_KEY_WIDTH));
}
