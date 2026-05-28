// Utility helpers for object mapping and safe DOM access.
// These functions are used by main.ts to normalize API payloads and
// to ensure required DOM elements exist before use.
type SourceObject = Record<string, unknown>;

// Resolve a dot-separated path into a nested object value. (ChatGPT)
function getNestedValue(obj: SourceObject, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;

    return (acc as SourceObject)[key];
  }, obj);
}

// Map values from a source object into a new record using path mappings.
function mapObject(
  source: SourceObject,
  mapper: Record<string, string>,
): Record<string, unknown> {
  const target: Record<string, unknown> = {};

  Object.entries(mapper).forEach(([targetKey, sourcePath]) => {
    target[targetKey] = getNestedValue(source, sourcePath);
  });

  return target;
}

// Select a DOM element by ID and throw an error if it does not exist. (Codex)
function getElementOrThrow<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} not found`);
  }

  return element as T;
}

export { getNestedValue, mapObject, getElementOrThrow };
