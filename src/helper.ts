// helper functions suggested by chatGPT
function getNestedValue(obj: Object, path: String) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function mapObject(source: Object, mapper: Object) {
  const target = {};

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
