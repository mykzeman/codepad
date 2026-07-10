/**
 * Base dictionary the prediction engine starts from: common English words
 * plus cross-language programming keywords. Ported verbatim from the old
 * WPF app's PredictionEngine.SeedWords.
 */
export const SEED_WORDS: readonly string[] = [
  // Common English
  "the", "and", "for", "you", "that", "this", "with", "have", "from", "not",
  "are", "was", "were", "will", "would", "should", "could", "can", "just",
  "about", "which", "their", "there", "here", "when", "what", "where", "who",
  "how", "all", "any", "some", "each", "more", "most", "other", "into", "than",
  "then", "them", "these", "those", "because", "before", "after", "between",
  "through", "during", "without", "within", "example", "please", "thanks",
  "hello", "world", "message", "error", "warning", "success", "failed",
  "user", "name", "email", "password", "value", "data", "file", "list",
  "item", "items", "number", "string", "object", "result", "results",

  // Programming keywords (cross-language)
  "if", "else", "elif", "for", "while", "do", "switch", "case", "break",
  "continue", "return", "function", "def", "class", "struct", "interface",
  "enum", "public", "private", "protected", "internal", "static", "const",
  "let", "var", "new", "this", "self", "super", "null", "nil", "none",
  "undefined", "true", "false", "void", "int", "float", "double", "bool",
  "boolean", "char", "byte", "long", "short", "string", "array", "list",
  "dict", "dictionary", "map", "set", "tuple", "try", "catch", "except",
  "finally", "throw", "throws", "raise", "import", "export", "from", "as",
  "using", "namespace", "include", "require", "module", "package",
  "async", "await", "yield", "lambda", "delegate", "event", "override",
  "virtual", "abstract", "sealed", "readonly", "final", "extends",
  "implements", "constructor", "init", "get", "set", "property",
  "console", "log", "print", "printf", "println", "debug", "assert",
  "test", "todo", "fixme", "params", "args", "kwargs", "index", "length",
  "count", "size", "push", "pop", "append", "remove", "insert", "sort",
  "filter", "map", "reduce", "foreach", "iterator", "callback", "promise",
  "component", "props", "state", "render", "endpoint", "request", "response",
  "query", "database", "table", "schema", "model", "controller", "service",
  "config", "options", "settings", "default", "constant", "global", "local",
];
