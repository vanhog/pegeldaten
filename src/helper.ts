// helper functions suggested by chatGPT
type SourceObject = Record<string, unknown>;

function getNestedValue(obj: SourceObject, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;

    return (acc as SourceObject)[key];
  }, obj);
}

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

// helper function suggested by codex
function getElementOrThrow<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Element #${id} not found`);
  }

  return element as T;
}

export { getNestedValue, mapObject, getElementOrThrow };
