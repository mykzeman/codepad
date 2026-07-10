import { literalKey, type KeyDefinition } from "../keyDefinition";

/** Math and logic operators. Ported verbatim from MathsLogicLayouts.cs. */
export const OPERATOR_ROWS: readonly (readonly KeyDefinition[])[] = [
  [
    literalKey("add", "+", 3), literalKey("subtract", "-", 3),
    literalKey("multiply", "*", 3), literalKey("divide", "/", 3),
    literalKey("modulo", "%", 3),
  ],
  [
    literalKey("assign", "=", 3), literalKey("addAssign", "+=", 3),
    literalKey("subtractAssign", "-=", 3), literalKey("equals", "==", 3),
    literalKey("notEquals", "!=", 3),
  ],
  [
    literalKey("lessThan", "<", 3), literalKey("greaterThan", ">", 3),
    literalKey("lessOrEqual", "<=", 3), literalKey("greaterOrEqual", ">=", 3),
  ],
  [
    literalKey("and", "&&", 3), literalKey("or", "||", 3),
    literalKey("not", "!", 3),
  ],
];
